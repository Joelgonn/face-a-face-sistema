import { createClient } from '@/app/utils/supabase/server';
import { listarUsuarios } from '@/app/actions/equipe';
import EquipeClient from './EquipeClient';
import { redirect } from 'next/navigation';

export default async function EquipePage() {
  const supabase = await createClient();
  
  // Pega o usuário logado atualmente (para saber quem é o Admin principal)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // --- BUSCA USUÁRIOS COM TRATAMENTO DE ERRO ---
  let usuarios = [];

  try {
    usuarios = await listarUsuarios();
  } catch (err) {
    console.error('[EQUIPE] Erro ao buscar usuários:', err);

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar equipe</h2>
          <p className="text-slate-500 mb-6">Não foi possível carregar a lista de usuários. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            🔄 Recarregar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <EquipeClient 
      initialUsuarios={usuarios} 
      currentUser={user.id} 
    />
  );
}