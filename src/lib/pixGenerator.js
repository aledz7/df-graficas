import { crc16 } from './crc16';

function formatValue(id, value) {
    const s = String(value);
    return id + String(s.length).padStart(2, '0') + s;
}

export function generatePixPayload({ chave, nome, cidade, valor, txid }) {
    nome = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
    cidade = cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15);
    
    const payload = [
        formatValue('00', '01'),
        formatValue('26', 
            formatValue('00', 'BR.GOV.BCB.PIX') +
            formatValue('01', chave)
        ),
        formatValue('52', '0000'),
        formatValue('53', '986'),
        formatValue('54', parseFloat(valor).toFixed(2)),
        formatValue('58', 'BR'),
        formatValue('59', nome),
        formatValue('60', cidade),
        formatValue('62', formatValue('05', txid || `***`)),
    ].join('');
    
    const payloadComCRC = payload + '6304';
    const crc = crc16(payloadComCRC);
    
    return payloadComCRC + crc;
}