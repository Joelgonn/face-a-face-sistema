import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/app/utils/supabase/server';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type PrescricaoResumo = {
  nome_medicamento: string | null;
  dosagem: string | null;
  posologia: string | null;
  horario_inicial: string | null;
  observacao: string | null;
  historico_administracao?: { data_hora: string | null }[];
};

type EncontristaResumo = {
  id: number;
  nome: string;
  responsavel: string | null;
  alergias: string | null;
  observacoes: string | null;
  check_in: boolean;
  prescricoes?: PrescricaoResumo[];
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const MAX_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1200;
const CHATBOT_SYSTEM_PROMPT = [
  'Voce e o assistente operacional do sistema Face a Face.',
  'Responda em portugues do Brasil, de forma objetiva e cuidadosa.',
  'Use somente os dados do contexto fornecido. Se faltar dado, diga que nao consta no sistema.',
  'Ajude com buscas por encontrista, presenca, alergias, responsaveis, medicamentos e doses em atraso ou proximas.',
  'Nao de orientacao medica. Para decisao clinica, recomende procurar a equipe responsavel ou profissional de saude.',
  'Quando citar pessoas, inclua o ID para facilitar a busca no dashboard.',
].join('\n');

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;

  const message = value as Partial<ChatMessage>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
}

function proximoHorario(prescricao: PrescricaoResumo) {
  if (!prescricao.posologia || !prescricao.horario_inicial) return null;

  const match = prescricao.posologia.match(/(\d+)\s*(?:h|hora)/i);
  if (!match) return null;

  const intervaloHoras = Number(match[1]);
  const historico = [...(prescricao.historico_administracao || [])]
    .filter((item) => item.data_hora)
    .sort((a, b) => {
      return new Date(b.data_hora as string).getTime() - new Date(a.data_hora as string).getTime();
    });

  if (historico[0]?.data_hora) {
    return new Date(new Date(historico[0].data_hora).getTime() + intervaloHoras * 60 * 60 * 1000);
  }

  const [hora, minuto] = prescricao.horario_inicial.split(':').map(Number);
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hora || 0, minuto || 0);
}

function montarContexto(encontristas: EncontristaResumo[]) {
  const agora = new Date();
  const presentes = encontristas.filter((pessoa) => pessoa.check_in).length;
  const comAlergia = encontristas.filter((pessoa) => pessoa.alergias?.trim()).length;

  const pessoas = encontristas.map((pessoa) => {
    const meds = pessoa.prescricoes || [];
    const proximos = meds
      .map((prescricao) => {
        const horario = proximoHorario(prescricao);
        const diffMinutos = horario ? Math.round((horario.getTime() - agora.getTime()) / 60000) : null;

        return {
          medicamento: prescricao.nome_medicamento,
          dosagem: prescricao.dosagem,
          posologia: prescricao.posologia,
          horario_inicial: prescricao.horario_inicial,
          observacao: prescricao.observacao,
          proximo_horario: horario?.toISOString() || null,
          status:
            diffMinutos === null
              ? 'sem_calculo'
              : diffMinutos < 0
                ? 'atrasado'
                : diffMinutos <= 30
                  ? 'atencao'
                  : 'em_dia',
          minutos_ate_proxima_dose: diffMinutos,
        };
      })
      .sort((a, b) => {
        return (a.minutos_ate_proxima_dose ?? 999999) - (b.minutos_ate_proxima_dose ?? 999999);
      });

    return {
      id: pessoa.id,
      nome: pessoa.nome,
      responsavel: pessoa.responsavel,
      presente: pessoa.check_in,
      alergias: pessoa.alergias,
      observacoes: pessoa.observacoes,
      medicamentos: proximos,
    };
  });

  return {
    gerado_em: agora.toISOString(),
    totais: {
      encontristas: encontristas.length,
      presentes,
      ausentes: encontristas.length - presentes,
      com_alergia: comAlergia,
    },
    pessoas,
  };
}

function formatarPessoa(id: number, nome: string) {
  return `ID ${id} - ${nome}`;
}

function formatarHorario(iso: string | null) {
  if (!iso) return 'horario nao calculado';

  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function encontrarPessoaNaPergunta(pergunta: string, contexto: ReturnType<typeof montarContexto>) {
  const texto = normalizarTexto(pergunta);
  const numeros = texto.match(/\d+/g) || [];

  for (const numero of numeros) {
    const pessoa = contexto.pessoas.find((item) => item.id === Number(numero));
    if (pessoa) return pessoa;
  }

  const porNome = [...contexto.pessoas]
    .sort((a, b) => b.nome.length - a.nome.length)
    .find((pessoa) => texto.includes(normalizarTexto(pessoa.nome)));

  if (porNome) return porNome;

  const palavras = texto
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((palavra) => palavra.length >= 3);

  return contexto.pessoas.find((pessoa) => {
    const nome = normalizarTexto(pessoa.nome);
    return palavras.length > 0 && palavras.every((palavra) => nome.includes(palavra));
  });
}

function responderConsultaLocal(pergunta: string, contexto: ReturnType<typeof montarContexto>) {
  const texto = pergunta.toLowerCase();
  const textoNormalizado = normalizarTexto(pergunta);

  if (/(medicacao|medicacoes|medicamento|medicamentos|remedio|remedios|prescricao|prescricoes)/i.test(textoNormalizado)) {
    const pessoa = encontrarPessoaNaPergunta(pergunta, contexto);

    if (pessoa) {
      if (pessoa.medicamentos.length === 0) {
        return `${formatarPessoa(pessoa.id, pessoa.nome)} nao tem medicacoes cadastradas no sistema.`;
      }

      return [
        `Medicacoes de ${formatarPessoa(pessoa.id, pessoa.nome)}:`,
        ...pessoa.medicamentos.map((medicamento) => {
          const detalhes = [
            medicamento.dosagem || 'sem dosagem',
            medicamento.posologia || 'sem posologia',
            medicamento.horario_inicial ? `inicio ${medicamento.horario_inicial}` : null,
            medicamento.status === 'atrasado' ? `atrasado; previsto para ${formatarHorario(medicamento.proximo_horario)}` : null,
            medicamento.status === 'atencao' ? `proxima dose em ate 30 min; ${formatarHorario(medicamento.proximo_horario)}` : null,
            medicamento.status === 'em_dia' ? `proxima dose ${formatarHorario(medicamento.proximo_horario)}` : null,
            medicamento.observacao ? `obs: ${medicamento.observacao}` : null,
          ].filter(Boolean);

          return `- ${medicamento.medicamento || 'Medicamento sem nome'} (${detalhes.join('; ')})`;
        }),
        '',
        'Use isso como apoio operacional; para decisao clinica, confirme com a equipe responsavel.',
      ].join('\n');
    }
  }

  if (/(check-?in|presente|presentes|fez check)/i.test(texto)) {
    const presentes = contexto.pessoas.filter((pessoa) => pessoa.presente);

    if (presentes.length === 0) {
      return `Nenhum encontrista consta como presente no momento. Total: ${contexto.totais.presentes} presentes de ${contexto.totais.encontristas}.`;
    }

    return [
      `${presentes.length} encontrista(s) fizeram check-in:`,
      ...presentes.map((pessoa) => `- ${formatarPessoa(pessoa.id, pessoa.nome)}`),
    ].join('\n');
  }

  if (/(dose|medicamento|remedio|medicacao).*(atrasad|vencid)|atrasad.*(dose|medicamento|remedio|medicacao)/i.test(texto)) {
    const atrasadas = contexto.pessoas.flatMap((pessoa) => {
      return pessoa.medicamentos
        .filter((medicamento) => medicamento.status === 'atrasado')
        .map((medicamento) => ({
          pessoa,
          medicamento,
        }));
    });

    if (atrasadas.length === 0) {
      return 'Nao encontrei doses atrasadas no momento.';
    }

    return [
      `${atrasadas.length} dose(s) constam como atrasadas:`,
      ...atrasadas.map(({ pessoa, medicamento }) => {
        const minutos = Math.abs(medicamento.minutos_ate_proxima_dose || 0);
        return `- ${formatarPessoa(pessoa.id, pessoa.nome)}: ${medicamento.medicamento || 'Medicamento sem nome'} (${medicamento.dosagem || 'sem dosagem'}), previsto para ${formatarHorario(medicamento.proximo_horario)}; atraso aproximado de ${minutos} minuto(s).`;
      }),
      '',
      'Use isso como apoio operacional; para decisao clinica, confirme com a equipe responsavel.',
    ].join('\n');
  }

  if (/(alergia|alergias|alergico|alergica)/i.test(texto)) {
    const comAlergia = contexto.pessoas.filter((pessoa) => pessoa.alergias?.trim());

    if (comAlergia.length === 0) {
      return 'Nao encontrei alergias registradas no momento.';
    }

    return [
      `${comAlergia.length} encontrista(s) tem alergia registrada:`,
      ...comAlergia.map((pessoa) => `- ${formatarPessoa(pessoa.id, pessoa.nome)}: ${pessoa.alergias}`),
    ].join('\n');
  }

  return null;
}

function mensagemErroModelo(error: unknown, usandoDeepSeek: boolean) {
  const err = error as { status?: number; code?: string; message?: string };

  if (err.status === 402) {
    return usandoDeepSeek
      ? 'A DeepSeek retornou HTTP 402. Verifique se a conta tem creditos/billing ativo para usar o chatbot com IA.'
      : 'A OpenAI retornou HTTP 402. Verifique os creditos/billing da conta para usar o chatbot com IA.';
  }

  if (err.status === 401) {
    return usandoDeepSeek
      ? 'A chave DEEPSEEK_API_KEY foi recusada. Confira se ela esta correta no .env.local e reinicie o servidor.'
      : 'A chave OPENAI_API_KEY foi recusada. Confira se ela esta correta no .env.local e reinicie o servidor.';
  }

  if (err.status === 429) {
    return 'O provedor de IA limitou as requisicoes agora. Tente novamente em instantes.';
  }

  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    return 'Nao consegui conectar ao provedor de IA agora. Verifique a conexao e tente novamente.';
  }

  return 'Nao consegui conversar com o provedor de IA agora. Tente novamente em instantes.';
}

async function gerarRespostaGemini(messages: ChatMessage[], contexto: ReturnType<typeof montarContexto>) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY nao configurada.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: CHATBOT_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Contexto atual do evento em JSON:\n${JSON.stringify(contexto)}` }],
          },
          ...messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
    }
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const message = data.error?.message || `Gemini retornou HTTP ${response.status}.`;
    throw Object.assign(new Error(message), { status: response.status });
  }

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
}

async function gerarRespostaOpenAICompativel({
  apiKey,
  baseURL,
  model,
  messages,
  contexto,
}: {
  apiKey: string;
  baseURL?: string;
  model: string;
  messages: ChatMessage[];
  contexto: ReturnType<typeof montarContexto>;
}) {
  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Contexto atual do evento em JSON:\n${JSON.stringify(contexto)}`,
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    temperature: 0.2,
    max_tokens: 700,
  });

  return completion.choices[0]?.message?.content?.trim();
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sessao expirada. Faca login novamente.' }, { status: 401 });
    }

    const body = (await request.json()) as { messages?: unknown };
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isChatMessage).slice(-MAX_MESSAGES).map((message) => ({
          role: message.role,
          content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
        }))
      : [];

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Envie uma mensagem para o assistente.' }, { status: 400 });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!deepseekApiKey && !geminiApiKey && !openaiApiKey) {
      return NextResponse.json(
        { error: 'Configure DEEPSEEK_API_KEY, GEMINI_API_KEY ou OPENAI_API_KEY no .env.local para ativar o chatbot.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('encontristas')
      .select(
        `id, nome, responsavel, alergias, observacoes, check_in, prescricoes (nome_medicamento, dosagem, posologia, horario_inicial, observacao, historico_administracao (data_hora))`
      )
      .order('nome', { ascending: true });

    if (error) {
      console.error('[CHATBOT] Erro ao buscar dados:', error);
      return NextResponse.json({ error: 'Nao foi possivel consultar os dados do evento.' }, { status: 500 });
    }

    const contexto = montarContexto((data || []) as unknown as EncontristaResumo[]);
    const respostaLocal = responderConsultaLocal(messages[messages.length - 1].content, contexto);

    if (respostaLocal) {
      return NextResponse.json({ answer: respostaLocal });
    }

    let providerError: unknown = null;

    if (deepseekApiKey) {
      try {
        const answer = await gerarRespostaOpenAICompativel({
          apiKey: deepseekApiKey,
          baseURL: 'https://api.deepseek.com',
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages,
          contexto,
        });

        return NextResponse.json({ answer: answer || 'Nao consegui gerar uma resposta agora.' });
      } catch (error) {
        providerError = error;
        console.error('[CHATBOT] DeepSeek falhou, tentando fallback:', error);
      }
    }

    if (geminiApiKey) {
      try {
        const answer = await gerarRespostaGemini(messages, contexto);
        return NextResponse.json({ answer: answer || 'Nao consegui gerar uma resposta agora.' });
      } catch (error) {
        providerError = error;
        console.error('[CHATBOT] Gemini falhou, tentando fallback:', error);
      }
    }

    if (openaiApiKey) {
      const answer = await gerarRespostaOpenAICompativel({
        apiKey: openaiApiKey,
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        messages,
        contexto,
      });

      return NextResponse.json({ answer: answer || 'Nao consegui gerar uma resposta agora.' });
    }

    throw providerError || new Error('Nenhum provedor de IA respondeu.');
  } catch (error) {
    console.error('[CHATBOT] Erro inesperado:', error);
    return NextResponse.json(
      { error: mensagemErroModelo(error, !!process.env.DEEPSEEK_API_KEY) },
      { status: 500 }
    );
  }
}
