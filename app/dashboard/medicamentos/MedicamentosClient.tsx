'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Database } from '@/types/supabase';
import { 
  ArrowLeft, Plus, Search, Save, Loader2, Trash2, 
  Pill, Pencil, X, AlertTriangle, CheckCircle2, Package,
  Hash
} from 'lucide-react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

type MedicamentoRow = Database['public']['Tables']['medicamentos']['Row'];

interface MedicamentosClientProps {
  initialMedicamentos: MedicamentoRow[];
}

interface ToastNotification {
  type: 'success' | 'error';
  title: string;
  message: string;
}

// --- FUNÇÃO SAFE QUERY (IDÊNTICA AOS OUTROS COMPONENTES, INFERÊNCIA AUTOMÁTICA) ---
async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn()
    
    // Verifica se é uma resposta do Supabase com erro
    if (result && typeof result === 'object') {
      const possibleError = result as { error?: { message: string } }
      if (possibleError.error) {
        throw possibleError.error
      }
    }
    
    return result
  } catch (err) {
    console.error('🔥 Erro crítico:', err)
    return null 
  }
}

// --- SKELETON CARD (CARREGAMENTO ELEGANTE) ---
function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-[2rem] p-5 flex items-center gap-4 w-full border border-slate-400">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
    </div>
  );
}

// --- SWIPEABLE CARD (COM BARRA LATERAL LARANJA RESTAURADA + SEPARAÇÃO MELHORADA) ---
const SWIPE_THRESHOLD = -60;

function SwipeableCard({ 
  children, 
  onEdit, 
  onDelete 
}: { 
  children: React.ReactNode; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const x = useMotionValue(0);

  // Fundo do card muda gradualmente de branco para vermelho suave
  const bg = useTransform(
    x,
    [-100, 0],
    ['#fee2e2', '#ffffff']
  );

  // Opacidade do fundo das ações aparece conforme arrasta
  const actionsOpacity = useTransform(
    x,
    [-100, -30],
    [1, 0]
  );

  const handleVibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-md shadow-slate-500/80 ring-1 ring-orange-100/50 hover:shadow-lg hover:shadow-slate-200/70 transition-shadow mb-3">
      {/* FUNDO DAS AÇÕES (ATRÁS DO CARD) */}
      <motion.div 
        style={{ opacity: actionsOpacity }}
        className="absolute inset-y-0 right-0 w-[120px] bg-red-50"
      />

      {/* AÇÕES (BOTÕES ALINHADOS VERTICALMENTE) */}
      <motion.div 
        style={{ opacity: actionsOpacity }}
        className="absolute top-1/2 -translate-y-1/2 right-4 flex gap-2 z-10"
      >
        <button 
          onClick={() => { handleVibrate(); x.stop(); x.set(0); onEdit(); }} 
          className="p-3 bg-orange-500 text-white rounded-xl shadow-md active:scale-90 transition-transform"
        >
          <Pencil size={18} />
        </button>
        <button 
          onClick={() => { handleVibrate(); x.stop(); x.set(0); onDelete(); }} 
          className="p-3 bg-red-500 text-white rounded-xl shadow-md active:scale-90 transition-transform"
        >
          <Trash2 size={18} />
        </button>
      </motion.div>

      {/* CARD PRINCIPAL */}
      <motion.div
        style={{ x, background: bg }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => {
          if (info.offset.x < SWIPE_THRESHOLD) {
            x.stop();
            x.set(-100);
          } else {
            x.stop();
            x.set(0);
          }
        }}
        whileTap={{ scale: 0.98 }}
        className="bg-white cursor-grab active:cursor-grabbing relative"
      >
        {/* BARRA LARANJA LATERAL (IDENTIDADE VISUAL RESTAURADA) */}
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-gradient-to-b from-orange-500 to-orange-400 rounded-l-[2rem]" />
        
        {/* CONTEÚDO COM ESPAÇO PARA A BARRA */}
        <div className="pl-2">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export default function MedicamentosClient({ initialMedicamentos }: MedicamentosClientProps) {
  const [medicamentos, setMedicamentos] = useState<MedicamentoRow[]>(initialMedicamentos);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMed, setCurrentMed] = useState<MedicamentoRow | null>(null); 
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const supabase = createClient();
  
  // Simula carregamento inicial para mostrar skeleton
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3000);
  };

  const abrirModal = (med: MedicamentoRow | null = null) => {
    setCurrentMed(med);
    setNome(med ? med.nome || '' : '');
    setIsModalOpen(true);
  };

  // --- HANDLE SALVAR COM SAFE QUERY E VALIDAÇÃO DE DUPLICIDADE ---
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      showToast('error', 'Atenção', 'Digite o nome do medicamento.');
      return;
    }

    // VALIDAÇÃO DE DUPLICIDADE
    const nomeNormalizado = nomeLimpo.toLowerCase();

    const existe = medicamentos.some(
      m => (m.nome || '').trim().toLowerCase() === nomeNormalizado
    );

    // Se estiver editando, ignora o próprio item
    if (existe && (!currentMed || currentMed.nome?.toLowerCase() !== nomeNormalizado)) {
      showToast('error', 'Duplicado', 'Medicamento já existe na base.');
      return;
    }

    setSaving(true);

    if (currentMed) {
      // UPDATE
      const backup =[...medicamentos];
      const medicamentoAtualizado = { ...currentMed, nome: nomeLimpo };
      setMedicamentos(prev =>
        prev.map(m => (m.id === currentMed.id ? medicamentoAtualizado : m))
      );

      const result = await safeQuery(async () =>
        await supabase
          .from('medicamentos')
          .update({ nome: nomeLimpo })
          .eq('id', currentMed.id)
          .select()
      );

      if (!result) {
        setMedicamentos(backup);
        showToast('error', 'Erro', 'Falha ao atualizar medicamento. Tente novamente.');
        setSaving(false);
        return;
      }

      showToast('success', 'Atualizado', 'Medicamento alterado com sucesso.');
    } else {
      // INSERT
      const result = await safeQuery(async () =>
        await supabase
          .from('medicamentos')
          .insert({ nome: nomeLimpo })
          .select()
          .single()
      );

      if (!result || !result.data) {
        showToast('error', 'Erro', 'Falha ao criar medicamento. Tente novamente.');
        setSaving(false);
        return;
      }

      const novo = result.data;

      setMedicamentos(prev =>
        [novo, ...prev].sort((a, b) =>
          (a.nome || '').localeCompare(b.nome || '')
        )
      );

      showToast('success', 'Criado', 'Medicamento adicionado à base.');
    }

    setIsModalOpen(false);
    setSaving(false);
  };

  // --- HANDLE EXCLUIR COM SAFE QUERY E ROLLBACK ---
  const handleExcluir = async (id: number) => {
    const backup = [...medicamentos];

    // Optimistic update
    setMedicamentos(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);

    const result = await safeQuery(async () =>
      await supabase.from('medicamentos').delete().eq('id', id).select()
    );

    if (!result) {
      setMedicamentos(backup);
      showToast('error', 'Erro ao excluir', 'O medicamento pode estar em uso em alguma prescrição.');
      return;
    }

    showToast('success', 'Excluído', 'Medicamento removido da base.');
  };

  const filtered = useMemo(() => 
    medicamentos.filter(m => (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase())),[medicamentos, searchTerm]
  );

  const handleVibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-24 overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
      
      {/* HEADER FIXO PREMIUM */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <Link href="/dashboard" className="p-2 text-slate-400 hover:text-orange-600 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Medicamentos</h1>
                    <p className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest">Base de Autocomplete</p>
                </div>
            </div>
            <button 
                onClick={() => { handleVibrate(); abrirModal(); }} 
                className="p-2.5 md:px-5 bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-200 flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95"
            >
                <Plus size={20} />
                <span className="hidden md:inline font-bold">Novo Medicamento</span>
            </button>
        </div>
      </div>

      <main className="w-full max-w-6xl mx-auto px-3 md:px-8 space-y-6 overflow-x-hidden scroll-smooth overscroll-y-contain">
        
        {/* STATS RÁPIDO (COMPACTO NO MOBILE) */}
        <div className="flex flex-col md:grid md:grid-cols-3 gap-3">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-300 flex items-center gap-3"
            >
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <Package size={20}/>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total na Base</p>
                    <p className="text-xl font-black text-slate-800">{filtered.length}</p>
                </div>
            </motion.div>
            
            {/* BUSCA PREMIUM */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="md:col-span-2 relative"
            >
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="Buscar medicamento na base..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 pl-14 pr-4 py-4 md:py-5 bg-white border border-slate-400 rounded-[2rem] focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm transition-all"
                />
            </motion.div>
        </div>

        {/* LISTA MOBILE - CARDS COM SWIPE (SEPARAÇÃO VISUAL REFORÇADA) */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((med) => (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <SwipeableCard
                    onEdit={() => abrirModal(med)}
                    onDelete={() => setDeletingId(med.id)}
                  >
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-orange-600 font-black text-xl border border-slate-200 shadow-sm shrink-0">
                          {med.nome?.[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-800 text-lg leading-tight truncate max-w-[180px]">{med.nome}</h3>
                          <div className="flex items-center gap-1 text-slate-400 mt-1">
                            <Hash size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">ID: {med.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* TABELA DESKTOP - ESTILO RELATÓRIO */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
        >
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black border-b border-slate-100">
                      <th className="p-6">Medicamento</th>
                      <th className="p-6">ID Sistema</th>
                      <th className="p-6 text-right">Ações</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {filtered.map((med) => (
                      <motion.tr 
                        key={med.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-orange-50/30 transition-all group"
                      >
                          <td className="p-6">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-orange-600 font-black">{med.nome?.[0].toUpperCase()}</div>
                                  <span className="font-bold text-slate-800 text-lg">{med.nome}</span>
                              </div>
                           </td>
                          <td className="p-6 text-slate-400 font-mono text-xs tracking-widest">#{med.id}</td>
                          <td className="p-6">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => abrirModal(med)} disabled={saving} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-orange-600 shadow-sm transition-all border border-transparent hover:border-slate-100 disabled:opacity-50">
                                      <Pencil size={18} />
                                  </button>
                                  <button onClick={() => setDeletingId(med.id)} disabled={saving} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 shadow-sm transition-all border border-transparent hover:border-slate-100 disabled:opacity-50">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          </td>
                      </motion.tr>
                  ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <Pill size={40} />
                </div>
                <p className="text-slate-400 font-bold text-lg">Nenhum medicamento encontrado</p>
            </div>
        )}
      </main>

      {/* MODAL ADICIONAR / EDITAR - ESTILO PREMIUM */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[3rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md p-8"
            >
              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800">{currentMed ? 'Editar' : 'Novo'}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações do Medicamento</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200 transition-colors"><X size={24}/></button>
              </div>
              <form onSubmit={handleSalvar} className="space-y-6">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Nome Comercial ou Genérico</label>
                      <input 
                          type="text" 
                          required 
                          value={nome} 
                          onChange={e => setNome(e.target.value)} 
                          className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 text-slate-800 font-bold text-lg transition-all" 
                          placeholder="Ex: Amoxicilina 500mg" 
                          autoFocus 
                      />
                  </div>
                  <motion.button 
                      type="submit" 
                      disabled={saving}
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-orange-200 disabled:opacity-70 transition-all flex justify-center items-center gap-3"
                  >
                      {saving ? <Loader2 className="animate-spin h-6 w-6"/> : <><Save size={22}/> Salvar Registro</>}
                  </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMAR EXCLUSÃO - ESTILO PREMIUM */}
      <AnimatePresence>
        {deletingId !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center border-b-8 border-red-500"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Excluir?</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                  Você está prestes a remover este item da base. Esta ação não afetará registros passados, apenas o autocomplete futuro.
              </p>
              <div className="flex gap-3">
                  <button onClick={() => setDeletingId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">Cancelar</button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleExcluir(deletingId)} 
                    disabled={saving} 
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    Excluir
                  </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION (Estilo Floating Air) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className={`flex items-center gap-4 p-5 rounded-[2rem] shadow-2xl border backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-600/95 border-emerald-400 text-white' : 'bg-red-600/95 border-red-400 text-white'}`}>
              <div className="p-2 bg-white/20 rounded-xl">
                {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div className="flex-1">
                <h4 className="font-black text-sm uppercase tracking-wider">{toast.title}</h4>
                <p className="text-xs font-bold opacity-90 leading-tight">{toast.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}