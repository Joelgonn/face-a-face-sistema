'use client'

import { EncontristaDashboard } from '@/app/dashboard/DashboardClient'

// 🔥 Chave para o localStorage
const CACHE_KEY = 'faceaface_encontristas_cache'
const CACHE_TIMESTAMP_KEY = 'faceaface_encontristas_cache_timestamp'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

// 🔥 Salvar cache de encontristas
export function saveEncontristasCache(encontristas: EncontristaDashboard[]): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(encontristas))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    console.log('[CACHE] Encontristas salvos no cache:', encontristas.length)
  } catch (error) {
    console.error('[CACHE] Erro ao salvar encontristas no cache:', error)
  }
}

// 🔥 Buscar cache de encontristas (com validação de TTL)
export function getCachedEncontristas(): EncontristaDashboard[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) {
      console.log('[CACHE] Nenhum cache encontrado')
      return null
    }
    
    // Verificar se o cache expirou
    const age = Date.now() - parseInt(timestamp)
    if (age > CACHE_TTL_MS) {
      console.log('[CACHE] Cache expirado, removendo...')
      clearEncontristasCache()
      return null
    }
    
    const encontristas = JSON.parse(cached) as EncontristaDashboard[]
    console.log('[CACHE] Cache encontrado:', encontristas.length, 'encontristas')
    return encontristas
    
  } catch (error) {
    console.error('[CACHE] Erro ao ler cache:', error)
    return null
  }
}

// 🔥 Verificar se existe cache válido
export function hasValidEncontristasCache(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) return false
    
    const age = Date.now() - parseInt(timestamp)
    return age <= CACHE_TTL_MS
    
  } catch {
    return false
  }
}

// 🔥 Limpar cache de encontristas
export function clearEncontristasCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    console.log('[CACHE] Cache de encontristas removido')
  } catch (error) {
    console.error('[CACHE] Erro ao limpar cache:', error)
  }
}

// 🔥 Atualizar um encontrista específico no cache (para optimistic updates)
export function updateEncontristaInCache(id: number, updates: Partial<EncontristaDashboard>): void {
  if (typeof window === 'undefined') return
  
  const cached = getCachedEncontristas()
  if (!cached) return
  
  const updated = cached.map(e => 
    e.id === id ? { ...e, ...updates } : e
  )
  
  saveEncontristasCache(updated)
}

// 🔥 Adicionar encontrista ao cache
export function addEncontristaToCache(encontrista: EncontristaDashboard): void {
  if (typeof window === 'undefined') return
  
  const cached = getCachedEncontristas()
  if (!cached) {
    saveEncontristasCache([encontrista])
    return
  }
  
  // Verificar se já existe
  if (cached.some(e => e.id === encontrista.id)) {
    updateEncontristaInCache(encontrista.id, encontrista)
    return
  }
  
  saveEncontristasCache([encontrista, ...cached])
}

// 🔥 Remover encontrista do cache
export function removeEncontristaFromCache(id: number): void {
  if (typeof window === 'undefined') return
  
  const cached = getCachedEncontristas()
  if (!cached) return
  
  const updated = cached.filter(e => e.id !== id)
  saveEncontristasCache(updated)
}