import { useTranslation } from 'next-i18next';
import { Button } from '@/components/Atoms';
import { Modal } from '@/components/Molecules';

const ConfirmationModal = ({ overlay, ...props }: any) => {
    const { t } = useTranslation();

    const modalContent = (
        <div className="w-full flex gap-3 pt-2 relative z-normal">
            <Button
                id="cancel-delete-btn"
                className="w-full"
                text={props.cancelBtnText ?? t('common.return')}
                onClick={props.onCancel}
            />
            <Button
                id="confirm-delete-btn"
                className="w-full"
                text={props.submitBtnText ?? t('common.validate')}
                isLoading={props.isLoading}
                onClick={props.onSubmit}
            />
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center" >
                {modalContent}
            </div>
        );
    }

    return (
        <Modal title={props.title ?? t('common.confirm')} canClose className={`${props.containerClassName ?? 'p-4 w-1/4 bg-white'}`}>
            {modalContent}
        </Modal>
    );
};

export default ConfirmationModal;
