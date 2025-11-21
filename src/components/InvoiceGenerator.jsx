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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      let yPos = 25;

      // Company Header with Background
      pdf.setFillColor(99, 102, 241); // Indigo color
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BESTACCORD TRANSPORTATION', pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Professional Logistics & Transportation Services', pageWidth / 2, 22, { align: 'center' });
      pdf.text('bestaccordtranspo@gmail.com', pageWidth / 2, 28, { align: 'center' });
      
      yPos = 45;

      // Reset text color
      pdf.setTextColor(0, 0, 0);

      // Invoice Title with background
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, yPos, contentWidth, 12, 'F');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', margin + 5, yPos + 8);
      
      pdf.setFontSize(14);
      pdf.setTextColor(99, 102, 241);
      pdf.text(`#${invoiceNumber}`, pageWidth - margin - 5, yPos + 8, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      
      yPos += 20;

      // Invoice Details in two columns
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Date:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(new Date()), margin + 35, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Due Date:', pageWidth - margin - 70, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(220, 38, 38);
      pdf.text(formatDate(getDueDate()), pageWidth - margin - 35, yPos, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      
      yPos += 6;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Trip Number:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(booking.tripNumber, margin + 35, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Service Date:', pageWidth - margin - 70, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(booking.dateNeeded), pageWidth - margin - 35, yPos, { align: 'right' });
      
      yPos += 6;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Reservation ID:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(booking.reservationId, margin + 35, yPos);
      
      yPos += 15;

      // Bill To Section with boxes
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPos, contentWidth / 2 - 2, 35, 'F');
      pdf.rect(pageWidth / 2 + 1, yPos, contentWidth / 2 - 2, 35, 'F');
      
      // Draw borders
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPos, contentWidth / 2 - 2, 35);
      pdf.rect(pageWidth / 2 + 1, yPos, contentWidth / 2 - 2, 35);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text('BILL TO', margin + 3, yPos + 6);
      pdf.text('SERVICE DETAILS', pageWidth / 2 + 4, yPos + 6);
      pdf.setTextColor(0, 0, 0);
      
      yPos += 11;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(booking.companyName, margin + 3, yPos, { maxWidth: contentWidth / 2 - 8 });
      
      pdf.setFont('helvetica', 'normal');
      pdf.text('Logistics & Transportation', pageWidth / 2 + 4, yPos);
      
      yPos += 6;
      
      pdf.setFontSize(9);
      pdf.setTextColor(75, 85, 99);
      const addressLines = pdf.splitTextToSize(booking.originAddress, contentWidth / 2 - 8);
      pdf.text(addressLines, margin + 3, yPos);
      
      pdf.text(`Vehicle: ${booking.vehicleType}`, pageWidth / 2 + 4, yPos);
      yPos += 5;
      pdf.text(`Plate: ${booking.plateNumber}`, pageWidth / 2 + 4, yPos);
      yPos += 5;
      
      const tripType = getDestinations().length > 1 
        ? `Multiple Stops (${getDestinations().length})` 
        : 'Single Destination';
      pdf.text(`Trip Type: ${tripType}`, pageWidth / 2 + 4, yPos);
      
      pdf.setTextColor(0, 0, 0);
      yPos += 20;

      // Destinations Table
      if (getDestinations().length > 0) {
        pdf.setFillColor(79, 70, 229);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('DELIVERY DESTINATIONS', margin + 3, yPos + 5.5);
        pdf.setTextColor(0, 0, 0);
        
        yPos += 12;

        // Table headers
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, yPos, contentWidth, 7, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Stop', margin + 3, yPos + 5);
        pdf.text('Destination Address', margin + 20, yPos + 5);
        pdf.text('Branch/Customer', pageWidth - margin - 50, yPos + 5);
        
        yPos += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        getDestinations().forEach((dest, idx) => {
          if (idx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, yPos - 3, contentWidth, 7, 'F');
          }
          
          pdf.text(`${idx + 1}`, margin + 5, yPos + 2);
          
          const destAddress = pdf.splitTextToSize(dest.destinationAddress, 85);
          pdf.text(destAddress[0], margin + 20, yPos + 2);
          
          const customerName = pdf.splitTextToSize(dest.customerEstablishmentName || 'N/A', 45);
          pdf.text(customerName[0], pageWidth - margin - 50, yPos + 2);
          
          yPos += 7;
        });
        
        yPos += 8;
      }

      // Items Table
      pdf.setFillColor(79, 70, 229);
      pdf.rect(margin, yPos, contentWidth, 8, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('ITEMS TRANSPORTED', margin + 3, yPos + 5.5);
      pdf.setTextColor(0, 0, 0);
      
      yPos += 12;

      // Table headers
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, yPos, contentWidth, 7, 'F');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Product Name', margin + 3, yPos + 5);
      pdf.text('Quantity', margin + 90, yPos + 5);
      pdf.text('Weight (kg)', margin + 120, yPos + 5);
      pdf.text('Status', pageWidth - margin - 25, yPos + 5);
      
      yPos += 10;

      pdf.setFont('helvetica', 'normal');
      
      if (getDestinations().length > 0) {
        getDestinations().forEach((dest, idx) => {
          if (idx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, yPos - 3, contentWidth, 7, 'F');
          }
          
          pdf.text(dest.productName, margin + 3, yPos + 2);
          pdf.text(dest.quantity?.toLocaleString() || 'N/A', margin + 95, yPos + 2, { align: 'right' });
          pdf.text(dest.grossWeight?.toString() || 'N/A', margin + 125, yPos + 2, { align: 'right' });
          pdf.text(dest.status === 'delivered' ? 'Delivered' : 'Pending', pageWidth - margin - 25, yPos + 2);
          yPos += 7;
        });

        if (getDestinations().length > 1) {
          yPos += 2;
          pdf.setFillColor(243, 244, 246);
          pdf.rect(margin, yPos - 3, contentWidth, 8, 'F');
          
          pdf.setFont('helvetica', 'bold');
          pdf.text('TOTAL', margin + 3, yPos + 2.5);
          pdf.text(getTotalQuantity().toLocaleString(), margin + 95, yPos + 2.5, { align: 'right' });
          pdf.text(`${getTotalWeight().toFixed(2)}`, margin + 125, yPos + 2.5, { align: 'right' });
          yPos += 10;
        } else {
          yPos += 5;
        }
      } else {
        pdf.text(booking.productName || 'N/A', margin + 3, yPos + 2);
        pdf.text(booking.quantity?.toLocaleString() || 'N/A', margin + 95, yPos + 2, { align: 'right' });
        pdf.text(booking.grossWeight || 'N/A', margin + 125, yPos + 2, { align: 'right' });
        pdf.text(booking.status === 'Completed' ? 'Delivered' : 'Pending', pageWidth - margin - 25, yPos + 2);
        yPos += 12;
      }

      // Vehicle & Team Section
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPos, contentWidth / 2 - 2, 25, 'F');
      pdf.rect(pageWidth / 2 + 1, yPos, contentWidth / 2 - 2, 25, 'F');
      
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPos, contentWidth / 2 - 2, 25);
      pdf.rect(pageWidth / 2 + 1, yPos, contentWidth / 2 - 2, 25);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text('VEHICLE USED', margin + 3, yPos + 6);
      pdf.text('SERVICE TEAM', pageWidth / 2 + 4, yPos + 6);
      pdf.setTextColor(0, 0, 0);
      
      yPos += 11;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Type: ${booking.vehicleType}`, margin + 3, yPos);
      pdf.text(`Plate: ${booking.plateNumber}`, margin + 3, yPos + 5);
      
      let teamYPos = yPos;
      if (booking.employeeDetails && booking.employeeDetails.length > 0) {
        booking.employeeDetails.forEach((emp) => {
          const empName = emp.employeeName || emp.fullName || 'N/A';
          pdf.text(`${emp.role}: ${empName}`, pageWidth / 2 + 4, teamYPos);
          teamYPos += 5;
        });
      } else {
        pdf.setTextColor(156, 163, 175);
        pdf.text('No team assigned', pageWidth / 2 + 4, teamYPos);
        pdf.setTextColor(0, 0, 0);
      }
      
      yPos += 20;

      // Invoice Summary - Professional styling
      pdf.setFillColor(79, 70, 229);
      pdf.rect(margin, yPos, contentWidth, 8, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('INVOICE SUMMARY', margin + 3, yPos + 5.5);
      pdf.setTextColor(0, 0, 0);
      
      yPos += 12;

      // Summary table
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPos, contentWidth, 10, 'F');
      
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPos, contentWidth, 10);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Transportation Service Fee', margin + 3, yPos + 6.5);
      
      // Format currency properly for PDF
      const amountText = formatCurrency(booking.deliveryFee);
      pdf.text(amountText, pageWidth - margin - 3, yPos + 6.5, { align: 'right' });
      
      yPos += 14;

      // Total Amount Due - Highlighted
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, yPos, contentWidth, 12, 'F');
      
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPos, contentWidth, 12);
      pdf.setLineWidth(0.2);
      
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text('TOTAL AMOUNT DUE', margin + 3, yPos + 8);
      
      pdf.setFontSize(16);
      const totalAmountText = formatCurrency(booking.deliveryFee || 0);
      pdf.text(totalAmountText, pageWidth - margin - 3, yPos + 8, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      
      yPos += 20;

      // Footer
      pdf.setFillColor(249, 250, 251);
      pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text('Thank you for choosing Bestaccord Logistics!', pageWidth / 2, pageHeight - 17, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('For inquiries about this invoice, please contact us at bestaccordtranspo@gmail.com', pageWidth / 2, pageHeight - 12, { align: 'center' });
      
      pdf.setFontSize(7);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated on: ${new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

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