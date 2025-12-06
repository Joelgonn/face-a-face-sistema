'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { 
  ArrowLeft, User, AlertTriangle, Shield, Pill, History, UserCheck, 
  Plus, X, Trash2, Clock, CheckCircle2, Pencil, Loader2, 
  ChevronDown, ChevronUp, CalendarClock, ThumbsUp, Info, Check 
} from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- Interfaces ---
interface Encontrista {
  id: number;
  nome: string;
  alergias: string | null;
  responsavel: string | null;
  observacoes: string | null;
  check_in: boolean;
}

interface Prescricao {
  id: number;
  nome_medicamento: string;
  dosagem: string;
  posologia: string;
  horario_inicial: string;
}

interface HistoricoItem {
  id: number;
  prescricao_id: number;
  data_hora: string;
  administrador: string;
  prescricao: { nome_medicamento: string, dosagem: string };
}

interface BaseMedicamento {
    id: number;
    nome: string;
}

// --- DICIONÁRIO DE RISCO CRUZADO (Segurança Clínica) ---
const FAMILIAS_DE_RISCO: Record<string, string[]> = {
  // Antibióticos Beta-lactâmicos
  'penicilina': ['amoxicilina', 'ampicilina', 'benzilpenicilina', 'piperacilina', 
                'clavulanato', 'benzetacil', 'oxacilina', 'cefalexina', 'cefazolina',
                'ceftriaxona', 'cefuroxima', 'cefepima', 'meropenem', 'imipenem',
                'ertapenem', 'aztreonam'],
  
  // AINES
  'aines': ['ibuprofeno', 'diclofenaco', 'aspirina', 'aas', 'nimesulida', 
           'cetoprofeno', 'naproxeno', 'piroxicam', 'indometacina', 'celecoxib',
           'etoricoxib', 'meloxicam', 'aceclofenaco', 'tenoxicam', 'nabumetona'],
  
  // Sulfonamidas
  'sulfa': ['sulfametoxazol', 'trimetoprima', 'bactrim', 'sulfadiazina',
           'sulfasalazina', 'sulfadoxina', 'sulfamerazina'],
  
  // Dipirona e derivados
  'dipirona': ['novalgina', 'lisador', 'magnopyrol', 'dipimed', 'neosaldina',
              'buscofen', 'termopirona'],
  
  // Paracetamol
  'paracetamol': ['tylenol', 'parador', 'dôrico', 'acetaminofen', 'cimegripe',
                 'tandrilax', 'vic'],
  
  // Corticoides
  'corticoides': ['prednisona', 'dexametasona', 'hidrocortisona', 'betametasona',
                 'metilprednisolona', 'triancinolona', 'cortisona', 'deflazacorte'],
  
  // IECA
  'ieca': ['captopril', 'enalapril', 'lisinopril', 'ramipril', 'perindopril',
          'quinapril', 'fosinopril', 'benazepril'],
  
  // ARA-II
  'bra': ['losartan', 'valsartan', 'candesartan', 'irbesartan', 'olmesartan',
         'telmisartan', 'eprosartan', 'azilsartan'],
  
  // Estatinas
  'estatinas': ['sinvastatina', 'atorvastatina', 'rosuvastatina', 'pravastatina',
               'lovastatina', 'fluvastatina', 'pitavastatina'],
  
  // Anticonvulsivantes
  'anticonvulsivantes': ['fenitoína', 'carbamazepina', 'valproato', 'fenobarbital',
                        'oxcarbazepina', 'lamotrigina', 'gabapentina', 'pregabalina',
                        'topiramato', 'levetiracetam'],
  
  // Antidepressivos
  'antidepressivos_ssri': ['fluoxetina', 'sertralina', 'paroxetina', 'citalopram',
                          'escitalopram', 'fluvoxamina'],
  
  'antidepressivos_triciclicos': ['amitriptilina', 'imipramina', 'clomipramina',
                                 'nortriptilina', 'desipramina'],
  
  // Antipsicóticos
  'antipsicoticos': ['haloperidol', 'clorpromazina', 'risperidona', 'quetiapina',
                    'olanzapina', 'aripiprazol', 'ziprasidona', 'clozapina'],
  
  // Anticoagulantes
  'acoas': ['varfarina', 'acenocumarol'],
  'doacs': ['dabigatrana', 'rivaroxabana', 'apixabana', 'edoxabana'],
  
  // Antiagregantes
  'antiagregantes': ['aas', 'clopidogrel', 'ticagrelor', 'prasugrel', 'dipiridamol',
                    'ticlopidina'],
  
  // Diuréticos
  'diureticos_tiazidicos': ['hidroclorotiazida', 'clortalidona', 'indapamida'],
  'diureticos_aliança': ['furosemida', 'bumetanida', 'torasemida'],
  'diureticos_poupadores': ['espironolactona', 'amilorida', 'triamtereno'],
  
  // Betabloqueadores
  'betabloqueadores': ['propranolol', 'atenolol', 'metoprolol', 'carvedilol',
                      'bisoprolol', 'nebivolol', 'labetalol'],
  
  // Bloqueadores de cálcio
  'bloqueadores_calcio': ['anlodipino', 'nifedipino', 'verapamil', 'diltiazem',
                         'nicardipino', 'felodipino'],
  
  // Quimioterápicos
  'quimioterapicos': ['cisplatina', 'carboplatina', 'oxaliplatina', 'ciclofosfamida',
                     'doxorrubicina', 'vincristina', 'paclitaxel', 'docetaxel',
                     'metotrexato', '5-fluorouracil', 'gemcitabina'],
  
  // Imunossupressores
  'imunossupressores': ['ciclosporina', 'tacrolimo', 'sirolimo', 'micofenolato',
                       'azatioprina', 'leflunomida', 'metotrexato'],
  
  // Contraste iodado
  'contraste_iodado': ['iohexol', 'iopamidol', 'ioversol', 'iodixanol', 'ioxitol'],
  
  // Laxantes
  'laxantes_estimulantes': ['bisacodil', 'picosulfato', 'sena', 'cáscara sagrada'],
  'laxantes_osmoticos': ['lactulose', 'polietilenoglicol', 'hidróxido de magnésio'],
  
  // Opioides (AQUI ESTÁ A MORFINA E CODEÍNA JUNTAS)
  'opioides': ['morfina', 'codeína', 'tramadol', 'oxicodona', 'hidromorfona',
              'fentanila', 'metadona', 'buprenorfina'],
  
  // Benzodiazepínicos
  'benzodiazepinicos': ['diazepam', 'lorazepam', 'clonazepam', 'alprazolam',
                       'bromazepam', 'midazolam', 'clordiazepóxido'],
  
  // Antifúngicos azólicos
  'antifungicos_azois': ['fluconazol', 'itraconazol', 'cetoconazol', 'voriconazol',
                        'posaconazol', 'isavuconazol'],
  
  // Antivirais
  'antivirais_herpes': ['aciclovir', 'valaciclovir', 'famciclovir', 'ganciclovir'],
  'antivirais_hiv': ['tenofovir', 'lamivudina', 'zidovudina', 'efavirenz', 'ritonavir',
                    'darunavir', 'dolutegravir', 'raltegravir'],
  
  // Antieméticos
  'antiemeticos': ['ondansetrona', 'metoclopramida', 'domperidona', 'bromoprida',
                  'prometazina', 'dexametasona'],
  
  // Broncodilatadores
  'broncodilatadores_beta2': ['salbutamol', 'fenoterol', 'formoterol', 'salmeterol',
                             'indacaterol', 'vilanterol'],
  'broncodilatadores_anticolinergicos': ['ipratrópio', 'tiotrópio', 'aclidínio',
                                        'glicopirrônio', 'umelidínio']
};

// --- Mapeamento de sinônimos para padronização ---
const SINONIMOS_MEDICAMENTOS: Record<string, string> = {
  'paracetamol': 'paracetamol',
  'acetaminofen': 'paracetamol',
  'acetaminofeno': 'paracetamol',
  'tylenol': 'paracetamol',
  'dipirona': 'dipirona',
  'novalgina': 'dipirona',
  'metamizol': 'dipirona',
  'aas': 'aspirina',
  'ácido acetilsalicílico': 'aspirina',
  'amoxil': 'amoxicilina',
  'clavulin': 'amoxicilina', 
  'azitromicina': 'azitromicina',
  'zitromax': 'azitromicina',
  'enalapril': 'enalapril',
  'renitec': 'enalapril',
  'losartan': 'losartan',
  'cozaar': 'losartan',
  'omeprazol': 'omeprazol',
  'prazol': 'omeprazol',
  'sinvastatina': 'sinvastatina',
  'zocor': 'sinvastatina',
  'ibuprofeno': 'ibuprofeno',
  'advil': 'ibuprofeno',
  'alivium': 'ibuprofeno',
  'codein': 'codeína',
  'dimorf': 'morfina'
};

// --- Funções Auxiliares ---
const formatarHora = (isoString: string) => {
  const data = new Date(isoString);
  return {
    hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: data.toLocaleDateString('pt-BR')
  };
};

const formatarNomeEnfermeiro = (email: string) => {
    if (!email) return 'Desconhecido';
    const parteNome = email.split('@')[0]; 
    const nomeLimpo = parteNome.replace(/[0-9]/g, '').replace(/[._]/g, ' ');
    return nomeLimpo.replace(/\b\w/g, l => l.toUpperCase()).trim();
};

const normalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
};

export default function DetalhesEncontrista() {
  const [pessoa, setPessoa] = useState<Encontrista | null>(null);
  const [medicacoes, setMedicacoes] = useState<Prescricao[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(false);

  // Modal Nova Medicação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medNome, setMedNome] = useState('');
  const [medDosagem, setMedDosagem] = useState('');
  const [medPosologia, setMedPosologia] = useState('');
  const [medHorario, setMedHorario] = useState('');

  // Modal Administrar
  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false);
  const [selectedPrescricao, setSelectedPrescricao] = useState<Prescricao | null>(null);
  const [horaAdministracao, setHoraAdministracao] = useState('');

  // Modal Excluir Medicação
  const [medicationToDelete, setMedicationToDelete] = useState<number | null>(null);

  // Modal de Alerta de Alergia
  const [allergyWarning, setAllergyWarning] = useState<{ show: boolean, message: string, onConfirm: () => void } | null>(null);

  // Combobox States
  const [baseMedicamentos, setBaseMedicamentos] = useState<BaseMedicamento[]>([]);
  const [sugestoes, setSugestoes] = useState<BaseMedicamento[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Modal Edição Pessoa
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editResponsavel, setEditResponsavel] = useState('');
  const [editAlergias, setEditAlergias] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  const params = useParams();
  const supabase = createClient();

  // --- LÓGICA ---

  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 4) v = v.slice(0, 4); 
    if (v.length >= 2) {
        const hora = parseInt(v.substring(0, 2));
        if (hora > 23) v = '23' + v.substring(2);
    }
    if (v.length === 4) {
        const minuto = parseInt(v.substring(2, 4));
        if (minuto > 59) v = v.substring(0, 2) + '59';
    }
    if (v.length > 2) {
        v = `${v.slice(0, 2)}:${v.slice(2)}`;
    }
    setMedHorario(v);
  };

  const handlePosologiaBlur = () => {
    const val = medPosologia.trim();
    if (!val) return;
    if (/^\d+$/.test(val)) {
        setMedPosologia(`${val}h`);
        return;
    }
    if (!val.match(/(h|hora)/i) && /\d/.test(val)) {
        setMedPosologia(`${val}h`);
    }
  };

  // --- NOVA LÓGICA DE ALERGIA INTELIGENTE (ATUALIZADA) ---
  const verificarConflitoAlergia = (nomeRemedio: string) => {
    if (!pessoa?.alergias) return null; 

    // 1. Normaliza e Verifica Sinônimos
    let remedioNormalizado = normalizarTexto(nomeRemedio);
    if (SINONIMOS_MEDICAMENTOS[remedioNormalizado]) {
        remedioNormalizado = SINONIMOS_MEDICAMENTOS[remedioNormalizado];
    }

    const listaAlergias = pessoa.alergias.split(/[,;]|\be\b/).map(s => normalizarTexto(s)).filter(s => s.length > 2);

    for (const alergia of listaAlergias) {
        // A. Verifica correspondência direta
        if (remedioNormalizado.includes(alergia) || alergia.includes(remedioNormalizado)) {
            return `Possível alergia direta a: ${alergia.toUpperCase()}`;
        }

        // B. Verifica Lógica de Famílias (Pais, Filhos e Irmãos)
        for (const [familia, membros] of Object.entries(FAMILIAS_DE_RISCO)) {
            const nomeFamilia = normalizarTexto(familia);

            // Cenário 1: Alergia é a Família (Ex: "Alergia a AINES" -> Remédio "Ibuprofeno")
            if (alergia === nomeFamilia && membros.some(m => remedioNormalizado.includes(m))) {
                return `Risco de Grupo: ${alergia.toUpperCase()} (Família)`;
            }

            // Cenário 2: Remédio é a Família (Ex: "Alergia a Amoxicilina" -> Remédio "Penicilina")
            if (remedioNormalizado === nomeFamilia && membros.some(m => alergia.includes(m))) {
                return `Risco de Grupo: ${alergia.toUpperCase()} pertence à família ${familia.toUpperCase()}`;
            }

            // Cenário 3: Irmãos (Ex: "Alergia a Morfina" -> Remédio "Codeína")
            // Verifica se TANTO a alergia QUANTO o remédio estão na lista de membros dessa família
            const alergiaEstaNaLista = membros.some(m => alergia.includes(m) || m.includes(alergia));
            const remedioEstaNaLista = membros.some(m => remedioNormalizado.includes(m));

            if (alergiaEstaNaLista && remedioEstaNaLista) {
                return `Reação Cruzada: ${alergia.toUpperCase()} e o remédio são do grupo ${familia.toUpperCase()}`;
            }
        }
    }
    
    return null;
  };

  const calcularStatus = (med: Prescricao) => {
    const ultimoRegistro = historico.find(h => h.prescricao_id === med.id);
    if (!ultimoRegistro) {
      return { texto: `Início: ${med.horario_inicial}`, cor: "text-slate-500", bg: "bg-slate-50 border-slate-100" };
    }
    const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i);
    if (!match) {
      return { texto: "Posologia complexa", cor: "text-blue-600", bg: "bg-blue-50 border-blue-100" };
    }
    const intervaloHoras = parseInt(match[1]);
    const dataUltima = new Date(ultimoRegistro.data_hora);
    const dataProxima = new Date(dataUltima.getTime() + intervaloHoras * 60 * 60 * 1000);
    const agora = new Date();
    
    const horaFormatada = dataProxima.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const diaFormatado = dataProxima.getDate() !== agora.getDate() ? `(${dataProxima.getDate()}/${dataProxima.getMonth()+1})` : '';

    if (agora > dataProxima) {
      return { texto: `ATRASADO (${horaFormatada})`, cor: "text-red-600 font-bold", bg: "bg-red-50 border-red-200 shadow-sm" };
    } else {
      const diffMinutos = (dataProxima.getTime() - agora.getTime()) / 1000 / 60;
      if (diffMinutos < 30) {
        return { texto: `Próxima: ${horaFormatada} ${diaFormatado}`, cor: "text-amber-600 font-bold", bg: "bg-amber-50 border-amber-200" };
      }
      return { texto: `Próxima: ${horaFormatada} ${diaFormatado}`, cor: "text-emerald-600 font-bold", bg: "bg-emerald-50 border-emerald-200" };
    }
  };

  const carregarDados = useCallback(async () => {
    if (!params.id) return;
    const { data: pessoaData } = await supabase.from('encontristas').select('*').eq('id', params.id).single();
    if (pessoaData) setPessoa(pessoaData);
    const { data: medData } = await supabase.from('prescricoes').select('*').eq('encontrista_id', params.id);
    setMedicacoes(medData || []);
    if (medData && medData.length > 0) {
        const idsPrescricoes = medData.map(m => m.id);
        const { data: histData } = await supabase
            .from('historico_administracao')
            .select(`*, prescricao:prescricoes (nome_medicamento, dosagem)`)
            .in('prescricao_id', idsPrescricoes)
            .order('data_hora', { ascending: false });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHistorico((histData as any) || []);
    } else { setHistorico([]); }
    const { data: baseMeds } = await supabase.from('medicamentos').select('id, nome').order('nome');
    setBaseMedicamentos(baseMeds || []);
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setMedNome(valor);
    if (valor.length > 0) {
        const filtrados = baseMedicamentos.filter(m => m.nome.toLowerCase().includes(valor.toLowerCase()));
        setSugestoes(filtrados);
        setMostrarSugestoes(true);
    } else { setMostrarSugestoes(false); }
  };

  const selecionarMedicamento = (nome: string) => {
    setMedNome(nome);
    setMostrarSugestoes(false);
  };

  const handleUpdatePessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('encontristas').update({ nome: editNome, responsavel: editResponsavel, alergias: editAlergias, observacoes: editObservacoes }).eq('id', params.id);
    if (!error) { setIsEditModalOpen(false); carregarDados(); }
    setSaving(false);
  };

  const executeSalvarMedicacao = async () => {
    setSaving(true);
    const { error } = await supabase.from('prescricoes').insert({ encontrista_id: params.id, nome_medicamento: medNome, dosagem: medDosagem, posologia: medPosologia, horario_inicial: medHorario });
    if (!error) { setMedNome(''); setMedDosagem(''); setMedPosologia(''); setMedHorario(''); setIsModalOpen(false); setAllergyWarning(null); carregarDados(); }
    setSaving(false);
  };

  const handleSalvarMedicacaoClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (medHorario.length !== 5 || !medHorario.includes(':')) { alert("Horário inválido"); return; }
    
    const conflito = verificarConflitoAlergia(medNome);
    
    if (conflito) {
        setAllergyWarning({
            show: true,
            message: conflito.toUpperCase(),
            onConfirm: () => executeSalvarMedicacao()
        });
    } else {
        executeSalvarMedicacao();
    }
  };

  // Abre modal de exclusão
  const openDeleteModal = (id: number) => {
    setMedicationToDelete(id);
  };

  // Confirma e deleta
  const confirmDeleteMedication = async () => {
    if (!medicationToDelete) return;
    const { error } = await supabase.from('prescricoes').delete().eq('id', medicationToDelete);
    if (!error) {
        setMedicationToDelete(null);
        carregarDados();
    }
  };

  const executeAbrirConfirmacao = (prescricao: Prescricao) => {
    setSelectedPrescricao(prescricao);
    setAllergyWarning(null); 
    const jaFoiAdministrado = historico.some(h => h.prescricao_id === prescricao.id);
    if (!jaFoiAdministrado && prescricao.horario_inicial) { setHoraAdministracao(prescricao.horario_inicial); } 
    else { setHoraAdministracao(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })); }
    setIsAdministerModalOpen(true);
  };

  const handleAdministrarClick = (prescricao: Prescricao) => {
    const conflito = verificarConflitoAlergia(prescricao.nome_medicamento);
    if (conflito) {
        setAllergyWarning({
            show: true,
            message: conflito.toUpperCase(),
            onConfirm: () => executeAbrirConfirmacao(prescricao)
        });
    } else {
        executeAbrirConfirmacao(prescricao);
    }
  };

  const confirmarAdministracao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescricao || !horaAdministracao) return;
    const dataHoje = new Date();
    const [horas, minutos] = horaAdministracao.split(':').map(Number);
    dataHoje.setHours(horas); dataHoje.setMinutes(minutos); dataHoje.setSeconds(0);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('historico_administracao').insert({ prescricao_id: selectedPrescricao.id, data_hora: dataHoje.toISOString(), administrador: user?.email || "Desconhecido" });
    setSaving(false); setIsAdministerModalOpen(false); carregarDados();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600"><Loader2 className="animate-spin mr-2" /> Carregando...</div>;
  if (!pessoa) return null;

  return (
    <div className="min-h-screen bg-orange-50 relative pb-20">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-4">
         <div className="max-w-3xl mx-auto flex items-center gap-4">
             <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                 <ArrowLeft size={20} />
             </Link>
             <h1 className="text-lg font-bold text-orange-600 truncate">{pessoa.nome}</h1>
         </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* --- CARD DE PERFIL --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
           <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-orange-200 shadow-lg shrink-0">
                    <User size={32} />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800 leading-tight">{pessoa.nome}</h1>
                    <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                        <Shield size={14} />
                        <span>Responsável: {pessoa.responsavel || ''}</span>
                    </div>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                    <button onClick={() => {
                        setEditNome(pessoa.nome); setEditResponsavel(pessoa.responsavel || '');
                        setEditAlergias(pessoa.alergias || ''); setEditObservacoes(pessoa.observacoes || '');
                        setIsEditModalOpen(true);
                    }} className="px-4 py-2 bg-slate-100 hover:bg-orange-200 text-orange-600 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                        <Pencil size={16} /> <span className="hidden sm:inline">Editar</span>
                    </button>
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border ${pessoa.check_in ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        {pessoa.check_in ? <><UserCheck size={16}/> Presente</> : 'Ausente'}
                    </div>
                </div>
           </div>
        </div>

        {/* --- ACORDEÃO DE INFORMAÇÕES --- */}
        <div>
            <button 
                onClick={() => setInfoExpanded(!infoExpanded)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.99] ${
                    pessoa.alergias 
                    ? 'bg-red-50 border-red-100 text-red-700' 
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
            >
                <div className="flex items-center gap-2 font-bold">
                    <Info size={20} />
                    <span>Informações Adicionais</span>
                    {pessoa.alergias && (
                        <span className="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full animate-pulse">
                            ⚠️ ALERGIAS
                        </span>
                    )}
                </div>
                {infoExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {infoExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className={`p-5 rounded-3xl border ${pessoa.alergias ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                        <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2 ${pessoa.alergias ? 'text-red-600' : 'text-slate-400'}`}>
                            <AlertTriangle size={16} /> Alergias
                        </h3>
                        <p className={`text-sm font-medium ${pessoa.alergias ? 'text-red-800' : 'text-slate-400 italic'}`}>
                            {pessoa.alergias || "Nenhuma alergia relatada."}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-2">
                            Observações
                        </h3>
                        <p className="text-sm text-slate-600 italic">
                            {pessoa.observacoes || "Sem observações adicionais."}
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* --- MEDICAÇÕES --- */}
        <div>
            <div className="flex justify-between items-end mb-4 px-1">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Pill className="text-orange-500" /> Medicações
                </h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-orange-50 text-orange-700 hover:bg-orange-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    <Plus size={18} /> Adicionar
                </button>
            </div>
            
            <div className="space-y-3">
                {medicacoes.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 border-dashed">
                        <p className="text-slate-400">Nenhuma medicação cadastrada.</p>
                    </div>
                )}

                {medicacoes.map(med => {
                    const status = calcularStatus(med);
                    return (
                        <div key={med.id} className={`bg-white p-5 rounded-3xl shadow-sm border transition-all ${status.bg}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-800 text-lg">{med.nome_medicamento}</h3>
                                        <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-500 shadow-sm">{med.dosagem}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm mt-2">
                                        <span className="text-slate-500 flex items-center gap-1 bg-slate-100/50 px-2 py-1 rounded-lg"><Clock size={14}/> {med.posologia}</span>
                                        <span className={`${status.cor} flex items-center gap-1 px-2 py-1 rounded-lg bg-white/50`}>{status.texto}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:border-none">
                                    <button 
                                        onClick={() => handleAdministrarClick(med)} 
                                        className="flex-1 sm:flex-none bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 font-bold"
                                    >
                                        <CheckCircle2 size={18} /> Administrar
                                    </button>
                                    <button 
                                        onClick={() => openDeleteModal(med.id)} 
                                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
                                        title="Excluir"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* --- HISTÓRICO --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                <History className="text-blue-500" /> Histórico
            </h2>
            <div className="relative space-y-6">
                {historico.length > 0 && <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-100 rounded-full"></div>}
                {historico.length === 0 && <p className="text-slate-400 text-sm italic text-center">Nenhum registro ainda.</p>}
                
                {historico.map((item) => {
                    const { hora, data } = formatarHora(item.data_hora);
                    return (
                        <div key={item.id} className="relative pl-8">
                            <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center z-10 shadow-sm">
                                <Check size={10} className="text-emerald-700 stroke-[4]" />
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{item.prescricao?.nome_medicamento || 'Medicação excluída'}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{item.prescricao?.dosagem}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-700">{hora}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{data}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                                    <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                        <User size={12} />
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {formatarNomeEnfermeiro(item.administrador)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>

      {/* --- MODAIS --- */}
      
      {/* MODAL ALERTA DE ALERGIA (TURBINADO) */}
      {allergyWarning && (
        <div className="fixed inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in duration-300 text-center border-4 border-red-100">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <AlertTriangle className="text-red-600 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-red-600 mb-2">ATENÇÃO!</h2>
                
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                    <p className="text-slate-600 font-medium mb-1 text-sm">O sistema detectou um conflito:</p>
                    <p className="text-lg font-bold text-red-800 uppercase break-words">
                        {allergyWarning.message}
                    </p>
                </div>

                <p className="text-xs text-slate-400 mb-6 px-2 leading-relaxed">
                    * Este alerta é automático e baseado em texto. <strong>Sempre verifique a ficha clínica e consulte o responsável de saúde.</strong> O sistema não substitui a avaliação profissional.
                </p>

                <div className="flex flex-col gap-3">
                    <button onClick={allergyWarning.onConfirm} className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                        <ThumbsUp size={18} /> Sim, estou ciente e assumo o risco
                    </button>
                    <button onClick={() => setAllergyWarning(null)} className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                        Cancelar Administração
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO DE PRESCRIÇÃO */}
      {medicationToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200 border-2 border-red-50">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="text-red-500 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-red-800 mb-2">Excluir Medicação?</h2>
                <p className="text-red-500 text-sm mb-6">
                    Isso removerá a prescrição e todo o histórico de administração.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setMedicationToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button onClick={confirmDeleteMedication} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all">Excluir</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL CONFIRMAR DOSE */}
      {isAdministerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="text-emerald-600 w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Confirmar Dose</h2>
                <p className="text-slate-500 text-sm mb-6">
                    Administrar <strong>{selectedPrescricao?.nome_medicamento}</strong> agora?
                </p>
                <form onSubmit={confirmarAdministracao}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Horário Realizado</label>
                        <div className="relative">
                            <input type="time" required value={horaAdministracao} onChange={e => setHoraAdministracao(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xl font-bold text-slate-800 tracking-wider" />
                            <div className="absolute left-3.5 top-4 text-slate-400 pointer-events-none"><CalendarClock size={20}/></div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsAdministerModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex justify-center items-center gap-2">
                            {saving ? <Loader2 className="animate-spin h-5 w-5"/> : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL NOVA MEDICAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-orange-600">Nova Medicação</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarMedicacaoClick} className="space-y-5">
              <div className="relative" ref={wrapperRef}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Medicamento</label>
                  <div className="relative">
                    <input type="text" required value={medNome} onChange={handleNomeChange} onFocus={() => { if(medNome) setMostrarSugestoes(true); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium" placeholder="Digite para buscar..." autoFocus autoComplete="off" />
                    <div className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none"><ChevronDown size={18}/></div>
                  </div>
                  {mostrarSugestoes && sugestoes.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-slate-100 rounded-xl mt-2 max-h-48 overflow-y-auto shadow-xl py-1">
                        {sugestoes.map(sugestao => (
                            <li key={sugestao.id} onClick={() => selecionarMedicamento(sugestao.nome)} className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer text-slate-700 text-sm border-b border-slate-50 last:border-none transition-colors">{sugestao.nome}</li>
                        ))}
                    </ul>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosagem</label><input type="text" required value={medDosagem} onChange={e => setMedDosagem(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="Ex: 500mg" /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horário</label><input type="text" required value={medHorario} onChange={handleHorarioChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-center tracking-wider font-medium" placeholder="00:00" maxLength={5} /></div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Posologia</label>
                  <input type="text" required value={medPosologia} onChange={e => setMedPosologia(e.target.value)} onBlur={handlePosologiaBlur} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="Ex: 8/8h" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-70 transition-all flex justify-center items-center gap-2">
                    {saving ? <Loader2 className="animate-spin h-5 w-5"/> : 'Salvar Medicação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-orange-600">Editar Dados</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdatePessoa} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input type="text" required value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável</label><input type="text" value={editResponsavel} onChange={e => setEditResponsavel(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800" /></div>
                <div><label className="block text-xs font-bold text-red-500 uppercase mb-1">Alergias</label><input type="text" value={editAlergias} onChange={e => setEditAlergias(e.target.value)} className="w-full px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 text-red-800" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label><textarea rows={3} value={editObservacoes} onChange={e => setEditObservacoes(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800" /></div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className="w-full py-3 bg-green-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-70 transition-all flex justify-center items-center gap-2">
                    {saving ? <Loader2 className="animate-spin h-5 w-5"/> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}