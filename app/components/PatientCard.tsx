'use client'

import { motion, useMotionValue, useTransform, Transition } from 'framer-motion'
import { 
  AlertCircle,
  UserCheck, 
  UserX 
} from 'lucide-react'

export type StatusType = {
  cor: string
  bordaL: string
  texto: string
  prioridade: number
  icone: React.ReactNode
}

type PatientCardProps = {
  id: number
  nome: string
  responsavel?: string | null
  alergias?: string | null
  status: StatusType
  checkIn: boolean
  flashId?: number | null
  onCheckIn: (id: number, currentStatus: boolean, nome: string) => void
  onClick?: () => void
}

// Easing premium (iOS-like)
const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25
}

export function PatientCard({
  id,
  nome,
  responsavel,
  alergias,
  status,
  checkIn,
  flashId,
  onCheckIn,
  onClick
}: PatientCardProps) {

  const isFlashing = flashId === id
  const x = useMotionValue(0)
  
  const bgColor = useTransform(
    x,
    [0, 100],
    ['rgba(255,255,255,1)', 'rgba(16,185,129,0.15)']
  )

  const handleSwipeComplete = () => {
    onCheckIn(id, checkIn, nome)
    x.set(0)
  }

  return (
    <motion.div
      layoutId={`card-${id}`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragSnapToOrigin
      style={{ x, backgroundColor: bgColor, transformOrigin: 'left center' }}
      onDragEnd={(_e, info) => {
        if (info.offset.x > 100) {
          handleSwipeComplete()
        }
      }}
      whileDrag={{ scale: 0.98 }}
      transition={springTransition}
      whileTap={{ scale: 0.96 }}
      className={`
        relative rounded-2xl border-l-8 ${status?.bordaL || 'border-l-slate-300'}
        bg-white/90 backdrop-blur-sm
        shadow-sm hover:shadow-md 
        transition-shadow duration-200
        overflow-hidden
        cursor-pointer
        ${isFlashing ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}
      `}
      onClick={onClick}
    >
      <div className="p-4 relative z-20">
        <div className="flex justify-between items-start gap-3">
          
          {/* LADO ESQUERDO (INFORMAÇÃO) - COM LAYOUTID PARA CONTINUIDADE */}
          <motion.div 
            layoutId={`card-header-${id}`}
            className="flex gap-3 flex-1 min-w-0"
          >
            {/* ÍCONE DE STATUS COM ANIMAÇÃO */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.12, delay: 0.03, ease: [0.22, 1, 0.36, 1] }}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                transition-all duration-200
                ${status?.cor.includes('rose') ? 'bg-rose-100 text-rose-600' : ''}
                ${status?.cor.includes('amber') ? 'bg-amber-100 text-amber-600' : ''}
                ${status?.cor.includes('emerald') ? 'bg-emerald-100 text-emerald-600' : ''}
                ${status?.cor.includes('slate') ? 'bg-slate-100 text-slate-500' : ''}
              `}
            >
              {status?.icone}
            </motion.div>

            {/* TEXTO */}
            <div className="flex flex-col min-w-0">
              {/* NOME (DOMINANTE) */}
              <motion.h3 
                layoutId={`card-title-${id}`}
                className="text-base md:text-lg font-bold tracking-tight text-slate-800 truncate"
              >
                {nome}
              </motion.h3>
              
              {/* STATUS (SECUNDÁRIO) */}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className={`
                  text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                  ${status?.cor || 'bg-slate-100 text-slate-600'}
                `}>
                  {status?.texto}
                </span>
                
                {responsavel && (
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    Resp: {responsavel}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* BOTÃO DE CHECK-IN */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onCheckIn(id, checkIn, nome)
            }}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
              transition-all duration-150
              ${checkIn 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              }
            `}
          >
            {checkIn ? (
              <UserCheck size={22} className="transition-transform duration-150" />
            ) : (
              <UserX size={22} className="transition-transform duration-150" />
            )}
          </motion.button>
        </div>

        {/* CONTEÚDO EXPANSÍVEL (alergias) */}
        {alergias && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 flex items-start gap-2 bg-rose-50/80 p-2.5 rounded-xl border border-rose-100"
          >
            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase text-rose-400 tracking-wider">Alergia</p>
              <p className="text-xs text-rose-700 font-medium truncate">{alergias}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}