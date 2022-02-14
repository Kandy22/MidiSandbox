import { Backdrop, Box, Fade, Modal } from '@mui/material';
import React from 'react';
import { useAppDispatch, useTypedSelector } from '../../app/store';
import ExampleModal from './ExampleModal';
import { closeModal, selectModalContainer } from './modalContainerSlice';
import { ExampleModalData } from './ExampleModal';
import DeleteBlockModal, { DeleteBlockModalData } from './DeleteBlockModal';

function ModalContainer() {
  const dispatch = useAppDispatch();
  const { open, modalId, modalData } = useTypedSelector((state) =>
    selectModalContainer(state)
  );
  const handleClose = () => {
    dispatch(closeModal());
  };

  if (modalId === null) return null;
  return (
    <div>
      <Modal
        open={open}
        onClose={handleClose}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
      >
        <Fade in={open}>
          <Box sx={style}>
            {modalId === 'EXAMPLE_MODAL' && modalData && <ExampleModal handleClose={handleClose} modalData={modalData as ExampleModalData} />}
            {modalId === 'DELETE_BLOCK_MODAL' && modalData && <DeleteBlockModal handleClose={handleClose} modalData={modalData as DeleteBlockModalData} />}
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default ModalContainer;
