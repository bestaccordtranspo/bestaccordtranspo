import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import jsPDF from 'jspdf';

const InvoiceGenerator = ({ booking, onClose, onInvoiceGenerated }) => {
  const [generating, setGenerating] = useState(false);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    return `INV${booking.reservationId?.slice(-6) || timestamp}`;
  };

  const invoiceNumber = generateInvoiceNumber();

  // Helper functions
  const getDestinations = () => {
    if (booking.destinationDeliveries && booking.destinationDeliveries.length > 0) {
      return booking.destinationDeliveries;
    }
    return [];
  };

  const getTotalQuantity = () => {
    const destinations = getDestinations();
    if (destinations.length > 0) {
      return destinations.reduce((sum, dest) => sum + (parseFloat(dest.quantity) || 0), 0);
    }
    return parseFloat(booking.quantity) || 0;
  };

  const getTotalWeight = () => {
    const destinations = getDestinations();
    if (destinations.length > 0) {
      return destinations.reduce((sum, dest) => sum + (parseFloat(dest.grossWeight) || 0), 0);
    }
    return parseFloat(booking.grossWeight) || 0;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const getDueDate = () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  };

  const downloadAsPDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let yPos = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BESTACCORD TRANSPORTATION', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Invoice Title
      pdf.setFontSize(16);
      pdf.text('INVOICE', margin, yPos);
      yPos += 10;

      // Invoice Details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Invoice No: ${invoiceNumber}`, margin, yPos);
      pdf.text(`Invoice Date: ${formatDate(new Date())}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
      pdf.text(`Trip No: ${booking.tripNumber}`, margin, yPos);
      pdf.text(`Service Date: ${formatDate(booking.dateNeeded)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
      pdf.text(`Reservation ID: ${booking.reservationId}`, margin, yPos);
      pdf.setTextColor(220, 38, 38);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Due Date: ${formatDate(getDueDate())}`, pageWidth - margin, yPos, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      yPos += 12;

      // Bill To Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('BILL TO', margin, yPos);
      pdf.text('SERVICE DETAILS', pageWidth / 2 + 5, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(booking.companyName, margin, yPos);
      pdf.text(`Service: Logistics & Transportation`, pageWidth / 2 + 5, yPos);
      yPos += 5;
      pdf.setFontSize(9);
      pdf.text(`Address: ${booking.originAddress}`, margin, yPos, { maxWidth: contentWidth / 2 - 10 });
      pdf.text(`Trip Type: ${getDestinations().length > 1 ? `Multiple Stops (${getDestinations().length})` : 'Single Destination'}`, pageWidth / 2 + 5, yPos);
      yPos += 5;
      pdf.text(`Vehicle: ${booking.vehicleType}`, pageWidth / 2 + 5, yPos);
      yPos += 5;
      pdf.text(`Plate Number: ${booking.plateNumber}`, pageWidth / 2 + 5, yPos);
      yPos += 12;

      // Destinations Table
      if (getDestinations().length > 0) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DELIVERY DESTINATIONS', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Stop', margin, yPos);
        pdf.text('Destination', margin + 15, yPos);
        pdf.text('Branch/Customer', pageWidth / 2 + 20, yPos);
        yPos += 5;

        pdf.setFont('helvetica', 'normal');
        getDestinations().forEach((dest, idx) => {
          pdf.text(`${idx + 1}`, margin, yPos);
          pdf.text(dest.destinationAddress, margin + 15, yPos, { maxWidth: 70 });
          pdf.text(dest.customerEstablishmentName, pageWidth / 2 + 20, yPos, { maxWidth: 70 });
          yPos += 6;
        });
        yPos += 6;
      }

      // Items Table
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ITEMS TRANSPORTED', margin, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      pdf.text('Product Name', margin, yPos);
      pdf.text('Quantity', margin + 70, yPos);
      pdf.text('Weight (kg)', margin + 110, yPos);
      pdf.text('Status', margin + 150, yPos);
      yPos += 5;

      pdf.setFont('helvetica', 'normal');
      if (getDestinations().length > 0) {
        getDestinations().forEach((dest) => {
          pdf.text(dest.productName, margin, yPos);
          pdf.text(dest.quantity?.toLocaleString() || 'N/A', margin + 70, yPos);
          pdf.text(dest.grossWeight?.toString() || 'N/A', margin + 110, yPos);
          pdf.text(dest.status === 'delivered' ? 'Delivered' : 'Pending', margin + 150, yPos);
          yPos += 5;
        });

        if (getDestinations().length > 1) {
          yPos += 2;
          pdf.setFont('helvetica', 'bold');
          pdf.text('TOTAL', margin, yPos);
          pdf.text(getTotalQuantity().toLocaleString(), margin + 70, yPos);
          pdf.text(`${getTotalWeight().toFixed(2)} kg`, margin + 110, yPos);
          yPos += 8;
        }
      } else {
        pdf.text(booking.productName || 'N/A', margin, yPos);
        pdf.text(booking.quantity?.toLocaleString() || 'N/A', margin + 70, yPos);
        pdf.text(booking.grossWeight || 'N/A', margin + 110, yPos);
        pdf.text(booking.status === 'Completed' ? 'Delivered' : 'Pending', margin + 150, yPos);
        yPos += 10;
      }

      // Vehicle & Team
      pdf.setFont('helvetica', 'bold');
      pdf.text('VEHICLE USED', margin, yPos);
      pdf.text('SERVICE TEAM', pageWidth / 2 + 5, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Type: ${booking.vehicleType}`, margin, yPos);
      
      if (booking.employeeDetails && booking.employeeDetails.length > 0) {
        booking.employeeDetails.forEach((emp, idx) => {
          pdf.text(`${emp.role}: ${emp.employeeName || emp.fullName}`, pageWidth / 2 + 5, yPos);
          yPos += 5;
        });
      } else {
        pdf.text('No team assigned', pageWidth / 2 + 5, yPos);
      }
      
      yPos = Math.max(yPos, yPos + 5);
      yPos += 10;

      // Invoice Summary
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE SUMMARY', margin, yPos);
      yPos += 6;
      pdf.text('Description', margin, yPos);
      pdf.text('Amount', pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Transportation Service Fee', margin, yPos);
      pdf.text(formatCurrency(booking.deliveryFee), pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('TOTAL AMOUNT DUE', margin, yPos);
      pdf.text(formatCurrency(booking.deliveryFee || 0), pageWidth - margin, yPos, { align: 'right' });
      yPos += 15;

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Thank you for choosing Bestaccord Logistics!', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      pdf.text('For inquiries about this invoice, please contact us at bestaccordtranspo@gmail.com', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });

      const fileName = `Invoice_${invoiceNumber}_${booking.tripNumber}.pdf`;
      pdf.save(fileName);

      if (onInvoiceGenerated) {
        onInvoiceGenerated({
          invoiceNumber,
          fileName,
          bookingId: booking._id,
          tripNumber: booking.tripNumber
        });
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Generate Invoice</h2>
              <p className="text-purple-100 text-sm mt-1">Review and download your invoice</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Invoice Preview Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-8 mb-6 border border-purple-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Invoice Preview</h3>
                <p className="text-sm text-gray-600">Review details before downloading</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-purple-200">
                <p className="text-xs text-gray-600 font-medium">Invoice No.</p>
                <p className="text-lg font-bold text-purple-600">{invoiceNumber}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium mb-1">Trip Number</p>
                  <p className="text-base font-semibold text-gray-900">{booking.tripNumber}</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium mb-1">Company</p>
                  <p className="text-base font-semibold text-gray-900">{booking.companyName}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium mb-1">Service Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(booking.dateNeeded)}</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-purple-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(booking.deliveryFee)}</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-purple-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Vehicle Type</p>
                  <p className="font-semibold text-gray-900">{booking.vehicleType}</p>
                </div>
                <div>
                  <p className="text-gray-600">Plate Number</p>
                  <p className="font-semibold text-gray-900">{booking.plateNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={downloadAsPDF}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download size={20} />
              <span className="font-semibold">{generating ? 'Generating PDF...' : 'Download Invoice PDF'}</span>
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800 text-center">
              📄 Your invoice will be downloaded as a PDF file with all transaction details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;