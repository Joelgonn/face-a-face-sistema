'use client'

import { motion, Transition } from 'framer-motion'
import { X, User, Phone, AlertCircle, Pill, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PatientDetailProps = {
  paciente: {
    id: number
    nome: string
    responsavel?: string | null
    alergias?: string | null
    observacoes?: string | null
    check_in: boolean
  }
  onClose: () => void
}

// Easing premium (iOS-like)
const springTransition: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 28
}

const fastTransition: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1]
}

export function PatientDetail({ paciente, onClose }: PatientDetailProps) {
  const router = useRouter()

  const handleNavigateToFullPage = () => {
    onClose()
    setTimeout(() => {
      router.push(`/dashboard/encontrista/${paciente.id}`)
    }, 150)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fastTransition}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layoutId={`card-${paciente.id}`}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100) {
            onClose()
          }
        }}
        transition={springTransition}
        className="absolute inset-x-0 bottom-0 top-auto md:inset-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full md:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER COM LAYOUTID PARA CONTINUIDADE */}
        <motion.div
          layoutId={`card-header-${paciente.id}`}
          className={`
            p-5 border-b
            ${paciente.check_in ? 'bg-emerald-500' : 'bg-gradient-to-r from-slate-700 to-slate-800'}
            text-white
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <User size={22} className="text-white" />
              </div>
              <div>
                <motion.h2 
                  layoutId={`card-title-${paciente.id}`}
                  className="text-lg md:text-xl font-black"
                >
                  {paciente.nome}
                </motion.h2>
                <p className="text-xs opacity-90 mt-0.5">
                  ID: {paciente.id} • {paciente.check_in ? 'Presente' : 'Ausente'}
                </p>
              </div>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={onClose}
              transition={{ duration: 0.08 }}
              className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
            >
              <X size={18} />
            </motion.button>
          </div>
        </motion.div>

        {/* CONTEÚDO */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="p-5 space-y-4 max-h-[60vh] overflow-y-auto"
        >
          {/* Responsável */}
          {paciente.responsavel && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Phone size={18} className="text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Responsável</p>
                <p className="text-sm font-semibold text-slate-700">{paciente.responsavel}</p>
              </div>
            </div>
          )}

          {/* Alergias */}
          {paciente.alergias && (
            <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Alergias / Atenção</p>
                <p className="text-sm font-semibold text-rose-700">{paciente.alergias}</p>
              </div>
            </div>
          )}

          {/* Observações */}
          {paciente.observacoes && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Observações</p>
                <p className="text-sm font-medium text-amber-700">{paciente.observacoes}</p>
              </div>
            </div>
          )}

          {/* Botão para página completa */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleNavigateToFullPage}
            className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink size={18} className="text-orange-500" />
              <span className="font-bold text-orange-700 text-sm">Ver página completa do paciente</span>
            </div>
            <span className="text-orange-500 text-xl">→</span>
          </motion.button>

          {/* Medicamentos (link) */}
          <Link
            href={`/dashboard/medicamentos?encontrista=${paciente.id}`}
            className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              onClose()
              setTimeout(() => {
                router.push(`/dashboard/medicamentos?encontrista=${paciente.id}`)
              }, 150)
            }}
          >
            <div className="flex items-center gap-3">
              <Pill size={18} className="text-blue-500" />
              <span className="font-bold text-blue-700 text-sm">Gerenciar Medicamentos</span>
            </div>
            <span className="text-blue-500 text-xl">→</span>
          </Link>
        </motion.div>

        {/* DICA DE GESTO (apenas mobile) */}
        <div className="md:hidden absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full" />
      </motion.div>
    </motion.div>
  )
}