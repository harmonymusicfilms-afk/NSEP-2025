import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';
import { APP_CONFIG } from '@/constants/config';

interface PaymentQRCodeProps {
  amount: number;
  upiId?: string;
  merchantName?: string;
  transactionRef?: string;
  className?: string;
  size?: number;
}

export function PaymentQRCode({
  amount,
  upiId = APP_CONFIG.paymentLink,
  merchantName = 'GRAM PANCHAYAT HELP DESK MISSION',
  transactionRef = 'NSEP2026',
  className = '',
  size = 256,
}: PaymentQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [amount, upiId, merchantName, transactionRef, size]);

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      
      // Create link based on whether upiId is a URL or a VPA
      let paymentLink = '';
      if (upiId.includes('razorpay.me') || upiId.startsWith('http')) {
        paymentLink = upiId.startsWith('http') ? upiId : `https://${upiId}`;
      } else {
        paymentLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&tr=${transactionRef}&am=${amount}&cu=INR`;
      }
      
      // Generate QR code as data URL
      const dataUrl = await QRCode.toDataURL(paymentLink, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      
      setQrDataUrl(dataUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-white p-6 rounded-2xl shadow-inner border-4 border-muted ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-inner border-4 border-muted ${className}`}>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="Payment QR Code"
          className="object-contain"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}

// Export a hook for getting UPI link
export function getUPILink(
  amount: number,
  upiId: string = APP_CONFIG.paymentLink,
  merchantName: string = 'GRAM PANCHAYAT HELP DESK MISSION',
  transactionRef: string = 'NSEP2026'
): string {
  return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&tr=${transactionRef}&am=${amount}&cu=INR`;
}
