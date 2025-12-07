import React from 'react';
const DeprecatedModal: React.FC<any> = ({ onClose }) => {
    React.useEffect(() => { if(onClose) onClose(); }, [onClose]);
    return null;
};
export default DeprecatedModal;