import React, { useState, useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas/dist/html2canvas.min.js';

const InvoiceGenerator = ({ booking, onClose, onInvoiceGenerated }) => {
  const [generating, setGenerating] = useState(false);
  const invoiceRef = useRef(null);

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
      if (!invoiceRef.current) return;
      
      setGenerating(true);
      try {
        const element = invoiceRef.current;
        
        // Store original styles
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        
        element.style.width = '210mm';
        element.style.maxWidth = '210mm';
        element.style.margin = '0';
        element.style.padding = '10mm';
        element.style.boxSizing = 'border-box';
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Convert to canvas with oklch color handling
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: element.scrollWidth,
          height: element.scrollHeight,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            // Replace all oklch colors in the cloned document
            const clonedElement = clonedDoc.querySelector('[data-invoice-content]');
            if (clonedElement) {
              const allElements = clonedElement.querySelectorAll('*');
              allElements.forEach(el => {
                const computedStyle = window.getComputedStyle(el);
                
                // Force convert colors to rgb
                if (computedStyle.color && computedStyle.color.includes('oklch')) {
                  el.style.color = '#000000';
                }
                if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('oklch')) {
                  el.style.backgroundColor = '#ffffff';
                }
                if (computedStyle.borderColor && computedStyle.borderColor.includes('oklch')) {
                  el.style.borderColor = '#d1d5db';
                }
              });
            }
          }
        });
        
        // Restore original styles
        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;
        element.style.margin = '';
        element.style.padding = '';
        element.style.boxSizing = '';
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
          hotfixes: ["px_scaling"]
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = pdfWidth / (canvasWidth / 2);
        const scaledHeight = (canvasHeight / 2) * ratio;
        
        if (scaledHeight <= pdfHeight) {
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight, undefined, 'FAST');
        } else {
          let remainingHeight = scaledHeight;
          let page = 1;
          
          while (remainingHeight > 0) {
            if (page > 1) {
              pdf.addPage();
            }
            
            const pageHeight = Math.min(pdfHeight, remainingHeight);
            const sourceY = (page - 1) * pdfHeight * (canvasHeight / scaledHeight);
            const sourceHeight = pageHeight * (canvasHeight / scaledHeight);
            
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = sourceHeight;
            const pageCtx = pageCanvas.getContext('2d');
            
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvasWidth, sourceHeight,
              0, 0, canvasWidth, sourceHeight
            );
            
            const pageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pageHeight);
            
            remainingHeight -= pageHeight;
            page++;
          }
        }
        
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

  const styles = {
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(5px)'
    },
    modalContent: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      maxWidth: '1000px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    header: {
      position: 'sticky',
      top: 0,
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 10
    },
    content: {
      padding: '20px'
    },
    invoice: {
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      color: '#000000',
      maxWidth: '100%',
      margin: '0 auto',
      padding: '0',
      boxSizing: 'border-box'
    }
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        {/* Modal Header */}
        <div style={styles.header}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Generate Invoice</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={downloadAsPDF}
              disabled={generating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: generating ? 0.5 : 1
              }}
            >
              <Download size={16} />
              <span>{generating ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button 
              onClick={onClose} 
              style={{
                padding: '8px 16px',
                backgroundColor: '#d1d5db',
                color: '#374151',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div style={styles.content}>
          <div ref={invoiceRef} data-invoice-content style={styles.invoice}>
            {/* Company Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #d1d5db', paddingBottom: '20px', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
                BESTACCORD TRANSPORTATION
              </h1>
            </div>

            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>INVOICE</h2>
                <div style={{ fontSize: '11px', color: '#374151' }}>
                  <p style={{ marginBottom: '3px' }}><strong>Invoice No:</strong> {invoiceNumber}</p>
                  <p style={{ marginBottom: '3px' }}><strong>Trip No:</strong> {booking.tripNumber}</p>
                  <p><strong>Reservation ID:</strong> {booking.reservationId}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#374151', minWidth: '120px' }}>
                <p><strong>Invoice Date:</strong></p>
                <p style={{ marginBottom: '6px' }}>{formatDate(new Date())}</p>
                <p><strong>Service Date:</strong></p>
                <p style={{ marginBottom: '6px' }}>{formatDate(booking.dateNeeded)}</p>
                <p><strong>Due Date:</strong></p>
                <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatDate(getDueDate())}</p>
              </div>
            </div>

            {/* Bill To & Service Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid #d1d5db', padding: '12px', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Bill To</h3>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>{booking.companyName}</p>
                  <p style={{ marginBottom: '4px' }}><strong>Address:</strong> {booking.originAddress}</p>
                </div>
              </div>
              
              <div style={{ border: '1px solid #d1d5db', padding: '12px', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Service Details</h3>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  <p style={{ marginBottom: '4px' }}><strong>Service:</strong> Logistics & Transportation</p>
                  <p style={{ marginBottom: '4px' }}><strong>Trip Type:</strong> {getDestinations().length > 1 ? `Multiple Stops (${getDestinations().length})` : 'Single Destination'}</p>
                  <p style={{ marginBottom: '4px' }}><strong>Vehicle:</strong> {booking.vehicleType}</p>
                  <p style={{ marginBottom: '4px' }}><strong>Plate Number:</strong> {booking.plateNumber}</p>
                  {booking.totalDistance && (
                    <p><strong>Total Distance:</strong> {booking.totalDistance.toFixed(2)} km</p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Destinations */}
            {getDestinations().length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>Delivery Destinations</h3>
                <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '10%' }}>Stop</th>
                        <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '45%' }}>Destination</th>
                        <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '45%' }}>Branch/Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDestinations().map((dest, index) => (
                        <tr key={index}>
                          <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{index + 1}</td>
                          <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{dest.destinationAddress}</td>
                          <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{dest.customerEstablishmentName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Items Transported */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>Items Transported</h3>
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {getDestinations().length > 1 && (
                        <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '10%' }}>Stop</th>
                      )}
                      <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '35%' }}>Product Name</th>
                      <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '20%' }}>Quantity</th>
                      <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '20%' }}>Weight (kg)</th>
                      <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '15%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDestinations().length > 0 ? (
                      <>
                        {getDestinations().map((dest, index) => (
                          <tr key={index}>
                            <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{dest.productName}</td>
                            <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{dest.quantity?.toLocaleString()}</td>
                            <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{dest.grossWeight}</td>
                            <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                backgroundColor: dest.status === 'delivered' ? '#d1fae5' : '#fef3c7',
                                color: dest.status === 'delivered' ? '#059669' : '#d97706'
                              }}>
                                {dest.status === 'delivered' ? '✓ Delivered' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {getDestinations().length > 1 && (
                          <tr style={{ borderTop: '2px solid #9ca3af', backgroundColor: '#f3f4f6' }}>
                            <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '11px' }} colSpan="2">TOTAL</td>
                            <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '11px' }}>{getTotalQuantity().toLocaleString()}</td>
                            <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '11px' }}>{getTotalWeight().toFixed(2)} kg</td>
                            <td style={{ padding: '10px', fontSize: '11px' }}></td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{booking.productName || 'N/A'}</td>
                        <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{booking.quantity?.toLocaleString() || 'N/A'}</td>
                        <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>{booking.grossWeight || 'N/A'}</td>
                        <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            backgroundColor: booking.status === 'Completed' ? '#d1fae5' : '#fef3c7',
                            color: booking.status === 'Completed' ? '#059669' : '#d97706'
                          }}>
                            {booking.status === 'Completed' ? '✓ Delivered' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicle & Team Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid #d1d5db', padding: '12px', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Vehicle Used</h3>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  <p style={{ marginBottom: '4px' }}><strong>Type:</strong> {booking.vehicleType}</p>
                  <p style={{ marginBottom: '4px' }}><strong>ID:</strong> {booking.vehicleId}</p>
                  <p><strong>Plate:</strong> {booking.plateNumber || 'N/A'}</p>
                </div>
              </div>
              
              <div style={{ border: '1px solid #d1d5db', padding: '12px', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Service Team</h3>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  {booking.employeeDetails && booking.employeeDetails.length > 0 ? (
                    booking.employeeDetails.map((emp, idx) => (
                      <p key={idx} style={{ marginBottom: '4px' }}>
                        <strong>{emp.role}:</strong> {emp.employeeName || emp.fullName}
                      </p>
                    ))
                  ) : booking.employeeAssigned && booking.employeeAssigned.length > 0 ? (
                    booking.employeeAssigned.map((empId, idx) => (
                      <p key={idx} style={{ marginBottom: '4px' }}>
                        <strong>Team Member {idx + 1}:</strong> {empId}
                      </p>
                    ))
                  ) : (
                    <p style={{ color: '#6b7280' }}>No team assigned</p>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Summary */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>Invoice Summary</h3>
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '70%' }}>Description</th>
                      <th style={{ backgroundColor: '#f3f4f6', padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #d1d5db', fontSize: '10px', width: '30%' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', fontSize: '10px' }}>Transportation Service Fee</td>
                      <td style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(booking.deliveryFee)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #9ca3af', backgroundColor: '#fef3c7' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '11px' }}>TOTAL AMOUNT DUE</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
                        {formatCurrency(booking.deliveryFee || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '9px', color: '#6b7280' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>Thank you for choosing Bestaccord Logistics!</p>
              <p style={{ marginBottom: '6px' }}>For inquiries about this invoice, please contact us at bestaccordtranspo@gmail.com</p>
              <p>Generated on: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;