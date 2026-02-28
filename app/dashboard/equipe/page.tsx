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

  // Busca a lista de usuários diretamente no servidor
  const usuarios = await listarUsuarios();

  return (
    <EquipeClient 
      initialUsuarios={usuarios} 
      currentUser={user.id} 
    />
  );
}