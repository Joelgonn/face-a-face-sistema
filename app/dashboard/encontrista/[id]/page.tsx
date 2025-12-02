'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { ArrowLeft, User, AlertTriangle, Shield, Pill, History, UserCheck, Plus, X, Trash2, Clock, CheckCircle2, Pencil, Save, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function DetalhesEncontrista() {
  const [pessoa, setPessoa] = useState<Encontrista | null>(null);
  const [medicacoes, setMedicacoes] = useState<Prescricao[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal de Medicação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medNome, setMedNome] = useState('');
  const [medDosagem, setMedDosagem] = useState('');
  const [medPosologia, setMedPosologia] = useState('');
  const [medHorario, setMedHorario] = useState('');

  // Estados do Modal de Edição de Pessoa
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editResponsavel, setEditResponsavel] = useState('');
  const [editAlergias, setEditAlergias] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  const params = useParams();
  const supabase = createClient();

  // --- FUNÇÃO INTELIGENTE DE ALERGIA ---
  const verificarAlergia = (nomeRemedio: string) => {
    if (!pessoa?.alergias) return false; // Sem alergias, tudo bem

    // Normaliza para minúsculas e divide por vírgula, ponto e vírgula ou espaço
    const alergias = pessoa.alergias.toLowerCase().split(/[,;]+/).map(s => s.trim());
    const remedio = nomeRemedio.toLowerCase();

    // Procura se alguma alergia está contida no nome do remédio
    const conflito = alergias.find(alergia => alergia.length > 2 && remedio.includes(alergia));

    if (conflito) {
        return `⚠️ ALERTA CRÍTICO DE ALERGIA!\n\nO paciente é alérgico a "${conflito.toUpperCase()}".\nVocê está tentando usar "${nomeRemedio.toUpperCase()}".\n\nISSO PODE SER PERIGOSO. Deseja continuar mesmo assim?`;
    }
    return false; // Sem conflito
  };

  const calcularStatus = (med: Prescricao) => {
    const ultimoRegistro = historico.find(h => h.prescricao_id === med.id);
    if (!ultimoRegistro) {
      return { texto: `Início: ${med.horario_inicial}`, cor: "text-gray-500", bg: "bg-gray-100" };
    }

    const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i);
    if (!match) {
      return { texto: "Posologia complexa", cor: "text-blue-600", bg: "bg-blue-50" };
    }

    const intervaloHoras = parseInt(match[1]);
    const dataUltima = new Date(ultimoRegistro.data_hora);
    const dataProxima = new Date(dataUltima.getTime() + intervaloHoras * 60 * 60 * 1000);
    const agora = new Date();

    const horaFormatada = dataProxima.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const diaFormatado = dataProxima.getDate() !== agora.getDate() ? `(${dataProxima.getDate()}/${dataProxima.getMonth()+1})` : '';

    if (agora > dataProxima) {
      return { texto: `ATRASADO (${horaFormatada})`, cor: "text-red-700", bg: "bg-red-100 border-red-200 animate-pulse" };
    } else {
      const diffMinutos = (dataProxima.getTime() - agora.getTime()) / 1000 / 60;
      if (diffMinutos < 30) {
        return { texto: `Próxima: ${horaFormatada} ${diaFormatado}`, cor: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" };
      }
      return { texto: `Próxima: ${horaFormatada} ${diaFormatado}`, cor: "text-green-700", bg: "bg-green-100 border-green-200" };
    }
  };

  const carregarDados = useCallback(async () => {
    if (!params.id) return;

    const { data: pessoaData, error: pessoaError } = await supabase
      .from('encontristas')
      .select('*')
      .eq('id', params.id)
      .single();

    if (pessoaError) { 
        alert("Encontrista não encontrado!"); 
        return; 
    }
    setPessoa(pessoaData);

    const { data: medData } = await supabase
      .from('prescricoes')
      .select('*')
      .eq('encontrista_id', params.id);
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
    } else {
        setHistorico([]);
    }
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const abrirEdicao = () => {
    if (pessoa) {
        setEditNome(pessoa.nome);
        setEditResponsavel(pessoa.responsavel || '');
        setEditAlergias(pessoa.alergias || '');
        setEditObservacoes(pessoa.observacoes || '');
        setIsEditModalOpen(true);
    }
  };

  const handleUpdatePessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase
        .from('encontristas')
        .update({
            nome: editNome,
            responsavel: editResponsavel,
            alergias: editAlergias,
            observacoes: editObservacoes
        })
        .eq('id', params.id);

    if (error) {
        alert("Erro ao atualizar: " + error.message);
    } else {
        setIsEditModalOpen(false);
        carregarDados(); 
    }
    setSaving(false);
  };

  // --- CADASTRAR REMÉDIO COM TRAVA DE ALERGIA ---
  const handleSalvarMedicacao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Verifica Alergia antes de salvar
    const alerta = verificarAlergia(medNome);
    if (alerta) {
        if (!confirm(alerta)) return; // Se cancelar, aborta o salvamento
    }

    setSaving(true);
    const { error } = await supabase.from('prescricoes').insert({
        encontrista_id: params.id,
        nome_medicamento: medNome,
        dosagem: medDosagem,
        posologia: medPosologia,
        horario_inicial: medHorario
      });
    if (!error) {
      setMedNome(''); setMedDosagem(''); setMedPosologia(''); setMedHorario('');
      setIsModalOpen(false);
      carregarDados();
    } else { alert(error.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    const { error } = await supabase.from('prescricoes').delete().eq('id', id);
    if (!error) carregarDados();
  };

  // --- ADMINISTRAR COM TRAVA DE ALERGIA ---
  const handleAdministrar = async (prescricao: Prescricao) => {
    // 1. Verifica Alergia antes de administrar
    const alerta = verificarAlergia(prescricao.nome_medicamento);
    if (alerta) {
        if (!confirm(alerta)) return; // Aborta se o usuário cancelar
    }

    if (!confirm(`Confirmar a administração de "${prescricao.nome_medicamento}" agora?`)) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('historico_administracao').insert({
            prescricao_id: prescricao.id,
            data_hora: new Date().toISOString(),
            administrador: user?.email || "Desconhecido"
        });
    carregarDados();
  };

  const formatarHora = (isoString: string) => {
      const data = new Date(isoString);
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + " - " + data.toLocaleDateString('pt-BR');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600">Carregando...</div>;
  if (!pessoa) return null;

  return (
    <div className="min-h-screen bg-orange-50 p-6 relative">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-orange-600 mb-6 font-medium"><ArrowLeft className="mr-2 h-5 w-5" /> Voltar para a Lista</Link>

        <div className="bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full text-white"><User size={40} /></div>
              <div>
                <h1 className="text-3xl font-bold text-white">{pessoa.nome}</h1>
                <p className="text-orange-100 text-sm flex items-center gap-1"><Shield size={14} /> Responsável: {pessoa.responsavel || '-'}</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
                <button onClick={abrirEdicao} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors backdrop-blur-sm">
                    <Pencil size={16} /> Editar Dados
                </button>
                <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${pessoa.check_in ? 'bg-green-500 text-white' : 'bg-white/90 text-orange-700'}`}>
                   <UserCheck size={16} /> {pessoa.check_in ? 'Check-in Realizado' : 'Aguardando Check-in'}
                </div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2"><AlertTriangle size={20} /> Alergias</h3>
              <p className="text-red-700 font-medium">{pessoa.alergias || "Nenhuma alergia relatada."}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-gray-700 font-bold mb-2">Observações</h3>
              <p className="text-gray-600 italic">{pessoa.observacoes || "Sem observações adicionais."}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Pill className="text-orange-500" /> Medicações</h2>
              <button onClick={() => setIsModalOpen(true)} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-200 flex items-center gap-2"><Plus size={16} /> Adicionar</button>
            </div>
            
            <div className="space-y-3">
              {medicacoes.length === 0 && <p className="text-gray-400 text-center py-4">Nenhuma medicação.</p>}
              {medicacoes.map(med => {
                  const status = calcularStatus(med);
                  return (
                    <div key={med.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${status.bg}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-800 text-lg">{med.nome_medicamento}</h3>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500">{med.dosagem}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600 flex items-center gap-1"><Clock size={14}/> {med.posologia}</span>
                            <span className={`font-bold ${status.cor}`}>{status.texto}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => handleAdministrar(med)} className="bg-white text-green-600 border border-green-200 hover:bg-green-50 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors text-sm font-bold" title="Dar baixa">
                            <CheckCircle2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(med.id)} className="text-gray-400 hover:text-red-600 p-2" title="Excluir"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6"><History className="text-blue-500" /> Histórico</h2>
            <div className="relative border-l-2 border-blue-100 ml-3 space-y-6">
                {historico.length === 0 && <p className="text-gray-400 text-sm pl-4">Sem registros.</p>}
                {historico.map((item) => (
                    <div key={item.id} className="ml-6 relative">
                        <div className="absolute -left-[31px] bg-blue-500 h-4 w-4 rounded-full border-4 border-white shadow-sm"></div>
                        <p className="text-xs text-gray-400 font-semibold">{formatarHora(item.data_hora)}</p>
                        <h4 className="font-bold text-gray-800">{item.prescricao?.nome_medicamento || 'Medicação excluída'}</h4>
                        <p className="text-xs text-gray-500 truncate w-40" title={item.administrador}>{item.administrador}</p>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE NOVA MEDICAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-orange-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg flex items-center gap-2"><Pill size={20}/> Nova Medicação</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white"><X size={24}/></button>
            </div>
            <form onSubmit={handleSalvarMedicacao} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input type="text" required value={medNome} onChange={e => setMedNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Ex: Dipirona" autoFocus /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Dosagem</label><input type="text" required value={medDosagem} onChange={e => setMedDosagem(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: 500mg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Horário</label><input type="text" required value={medHorario} onChange={e => setMedHorario(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: 14:00" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Posologia</label><input type="text" required value={medPosologia} onChange={e => setMedPosologia(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: 6 em 6h" /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg shadow-sm disabled:opacity-50">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PESSOA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg flex items-center gap-2"><Pencil size={20}/> Editar Dados</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white hover:bg-gray-700 rounded-full p-1 transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={handleUpdatePessoa} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input type="text" required value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label><input type="text" value={editResponsavel} onChange={e => setEditResponsavel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label><input type="text" value={editAlergias} onChange={e => setEditAlergias(e.target.value)} className="w-full px-3 py-2 border border-red-200 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-red-900" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={3} value={editObservacoes} onChange={e => setEditObservacoes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg flex items-center gap-2">{saving ? <Loader2 className="animate-spin h-4 w-4"/> : <><Save size={18}/> Salvar Alterações</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}