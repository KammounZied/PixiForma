import { forwardRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCurrentModal } from '@/contexts/ModalContext'
import WithChildren from '@/types/WithChildren'
import { twMerge } from 'tailwind-merge'
import { IMoleculeModal } from '@/interfaces'
import { Icon, Label } from '@/components/Atoms'
import { ETypographyType } from '@/Enum/Enum'

const MoleculeModal = forwardRef<HTMLDivElement, WithChildren<IMoleculeModal>>(
  (
    {
      children,
      canClose,
      canCloseOnClickOutisde,
      bodyClassName,
      title,
      isDrawer,
      className,
      subTitle
    },
    ref
  ) => {
    const { closeModal, setCanClose, setCanCloseOnClickOutside, setIsDrawer } = useCurrentModal()

    useEffect(() => {
      setCanClose?.(!!canClose)
      setCanCloseOnClickOutside?.(!!canCloseOnClickOutisde)
      setIsDrawer?.(!!isDrawer)
      return () => {
        setCanClose?.(false)
        setCanCloseOnClickOutside?.(false)
        setIsDrawer?.(false)
      }
    }, [
      setCanClose,
      setCanCloseOnClickOutside,
      canCloseOnClickOutisde,
      canClose,
      setIsDrawer,
      isDrawer,
    ])

    return (
      <motion.div
        className={twMerge(`w-full h-full  sm:w-full sm:h-full  md:w-1/3 md:h-auto flex flex-col bg-white relative shadow-md ${isDrawer ? 'h-screen' : 'rounded-lg'} ${className}`)}
        ref={ref}
        initial={isDrawer ? { x: 1000 } : { opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, x: 0, translateY: 0 }}
        exit={isDrawer ? { x: 1000 } : { opacity: 0, translateY: -20 }}
        transition={{ ease: 'easeInOut', duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        data-modal="true"
      >
        {canClose && (
          <div className="flex justify-between items-center rounded-t-lg py-1 pl-5 pr-2 text-white bg-primary-400 z-modal">
            <div className='flex flex-col'>
              <Label typeStyle={ETypographyType.H1App} className='text-white'>{title}</Label>
              <Label typeStyle={ETypographyType.BodyRegular} className='text-primary-100'>{subTitle}</Label>
            </div>
            <button
              title="close"
              className="flex items-center justify-center border-none rounded-full p-0 h-8 w-8 cursor-pointer ml-auto bg-secondary-gris-clair"
              onClick={closeModal}
            >
              <Icon size='text-xl' name="close" color="primary" />
            </button>
          </div>
        )}
        <div className={`${bodyClassName} p-4`}>{children}</div>
      </motion.div>
    )
  }
)

MoleculeModal.displayName = 'Modal'

export default MoleculeModal
