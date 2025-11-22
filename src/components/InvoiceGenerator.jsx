import React, { useState, useRef } from 'react';
import { Download, FileText, Calendar, MapPin, Package, Truck, User, Building } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const InvoiceGenerator = ({ booking, onClose, onInvoiceGenerated }) => {
  const [generating, setGenerating] = useState(false);
  const invoiceRef = useRef(null);

  // Generate invoice number based on booking data
  const generateInvoiceNumber = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    return `INV${booking.reservationId?.slice(-6) || timestamp}`;
  };

  const invoiceNumber = generateInvoiceNumber();

  const downloadAsPDF = async () => {
    if (!invoiceRef.current) return;
    
    setGenerating(true);
    try {
      const element = invoiceRef.current;
      
      // First, temporarily set a fixed width for the invoice content
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      
      // Set a consistent width for PDF generation (A4 width minus margins)
      element.style.width = '210mm';
      element.style.maxWidth = '210mm';
      element.style.margin = '0';
      element.style.padding = '10mm';
      element.style.boxSizing = 'border-box';
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(element, {
        scale: 2, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: 794, // A4 width in pixels at 96 DPI
        windowHeight: 1123, // A4 height in pixels at 96 DPI
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => {
          return element.tagName === 'VIDEO' || element.tagName === 'CANVAS';
        },
        onclone: (clonedDoc) => {
          // Comprehensive style override to prevent oklch/oklab issues
          const clonedElement = clonedDoc.querySelector('[data-invoice-content]');
          if (clonedElement) {
            // First, add comprehensive CSS reset to override all problematic styles
            const resetStyle = clonedDoc.createElement('style');
            resetStyle.textContent = `
              /* Complete CSS reset for PDF generation */
              *, *::before, *::after {
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                outline: none !important;
                text-decoration: none !important;
                list-style: none !important;
                background: transparent !important;
                color: #000000 !important;
                font-family: Arial, sans-serif !important;
                font-weight: normal !important;
                font-style: normal !important;
                text-align: left !important;
                vertical-align: top !important;
                line-height: 1.4 !important;
              }
              
              /* Override root container */
              [data-invoice-content] {
                width: 210mm !important;
                max-width: 210mm !important;
                min-width: 210mm !important;
                margin: 0 !important;
                padding: 10mm !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                font-family: Arial, sans-serif !important;
                font-size: 12px !important;
                line-height: 1.4 !important;
                box-sizing: border-box !important;
              }
              
              /* Typography overrides */
              [data-invoice-content] h1 {
                font-size: 22px !important;
                font-weight: bold !important;
                color: #111827 !important;
                margin-bottom: 6px !important;
                text-align: center !important;
              }
              
              [data-invoice-content] h2 {
                font-size: 18px !important;
                font-weight: bold !important;
                color: #111827 !important;
                margin-bottom: 8px !important;
              }
              
              [data-invoice-content] h3 {
                font-size: 13px !important;
                font-weight: bold !important;
                color: #111827 !important;
                margin-bottom: 8px !important;
              }
              
              [data-invoice-content] h4 {
                font-size: 12px !important;
                font-weight: bold !important;
                color: #1d4ed8 !important;
                margin-bottom: 6px !important;
              }
              
              [data-invoice-content] p {
                font-size: 11px !important;
                color: #000000 !important;
                margin-bottom: 3px !important;
                line-height: 1.4 !important;
              }
              
              /* Layout overrides */
              [data-invoice-content] .company-header {
                text-align: center !important;
                border-bottom: 2px solid #d1d5db !important;
                padding-bottom: 20px !important;
                margin-bottom: 20px !important;
                background-color: #ffffff !important;
              }
              
              [data-invoice-content] .invoice-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                margin-bottom: 24px !important;
                gap: 20px !important;
              }
              
              [data-invoice-content] .grid {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 16px !important;
                margin-bottom: 24px !important;
              }
              
              [data-invoice-content] .card {
                border: 1px solid #d1d5db !important;
                padding: 12px !important;
                border-radius: 4px !important;
                background-color: #ffffff !important;
                min-height: 100px !important;
              }
              
              /* Table overrides */
              [data-invoice-content] table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                font-size: 11px !important;
                background-color: #ffffff !important;
              }
              
              [data-invoice-content] th {
                background-color: #f3f4f6 !important;
                color: #000000 !important;
                padding: 8px 10px !important;
                text-align: left !important;
                font-weight: bold !important;
                border-bottom: 1px solid #d1d5db !important;
                font-size: 10px !important;
              }
              
              [data-invoice-content] th.text-right {
                text-align: right !important;
              }
              
              [data-invoice-content] td {
                padding: 8px 10px !important;
                border-top: 1px solid #d1d5db !important;
                font-size: 10px !important;
                word-wrap: break-word !important;
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              
              [data-invoice-content] td.text-right {
                text-align: right !important;
              }
              
              [data-invoice-content] .total-row {
                border-top: 2px solid #9ca3af !important;
                background-color: #fef3c7 !important;
                font-weight: bold !important;
              }
              
              [data-invoice-content] .total-row td {
                font-weight: bold !important;
                font-size: 11px !important;
                background-color: #fef3c7 !important;
              }
              
              /* Payment terms */
              [data-invoice-content] .payment-terms {
                background-color: #eff6ff !important;
                border: 1px solid #bfdbfe !important;
                padding: 12px !important;
                border-radius: 4px !important;
                margin-bottom: 20px !important;
              }
              
              [data-invoice-content] .payment-terms * {
                color: #1e40af !important;
              }
              
              /* Footer */
              [data-invoice-content] .footer {
                text-align: center !important;
                margin-top: 20px !important;
                padding-top: 12px !important;
                border-top: 1px solid #e5e7eb !important;
                font-size: 9px !important;
                color: #6b7280 !important;
              }
              
              /* Company info */
              [data-invoice-content] .company-info {
                color: #6b7280 !important;
                font-size: 13px !important;
                margin-bottom: 3px !important;
              }
              
              /* Date info */
              [data-invoice-content] .date-info {
                text-align: right !important;
                font-size: 11px !important;
                color: #374151 !important;
              }
              
              [data-invoice-content] .due-date {
                color: #dc2626 !important;
                font-weight: bold !important;
              }
              
              /* Invoice details */
              [data-invoice-content] .invoice-details {
                font-size: 11px !important;
                color: #374151 !important;
              }
              
              /* Card content */
              [data-invoice-content] .card-content {
                font-size: 11px !important;
                line-height: 1.4 !important;
                color: #000000 !important;
              }
              
              /* Remove all modern CSS features */
              [data-invoice-content] * {
                backdrop-filter: none !important;
                filter: none !important;
                box-shadow: none !important;
                text-shadow: none !important;
                transform: none !important;
                transition: none !important;
                animation: none !important;
                background-image: none !important;
                background-attachment: scroll !important;
                background-repeat: no-repeat !important;
                background-position: 0 0 !important;
                background-size: auto !important;
                background-origin: padding-box !important;
                background-clip: border-box !important;
              }
            `;
            clonedDoc.head.insertBefore(resetStyle, clonedDoc.head.firstChild);
            
            // Set root element properties
            clonedElement.style.setProperty('width', '210mm', 'important');
            clonedElement.style.setProperty('max-width', '210mm', 'important');
            clonedElement.style.setProperty('margin', '0', 'important');
            clonedElement.style.setProperty('padding', '10mm', 'important');
            clonedElement.style.setProperty('box-sizing', 'border-box', 'important');
            clonedElement.style.setProperty('background-color', '#ffffff', 'important');
            clonedElement.style.setProperty('color', '#000000', 'important');
            clonedElement.style.setProperty('font-family', 'Arial, sans-serif', 'important');
            
            // Force override all elements to prevent oklch/oklab parsing
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el, index) => {
              try {
                // Remove all CSS custom properties and modern color functions
                const computedStyle = window.getComputedStyle(el);
                
                // Clear problematic style properties
                el.style.setProperty('background-color', '#ffffff', 'important');
                el.style.setProperty('color', '#000000', 'important');
                el.style.setProperty('border-color', '#d1d5db', 'important');
                el.style.setProperty('font-family', 'Arial, sans-serif', 'important');
                
                // Remove modern CSS properties
                el.style.removeProperty('backdrop-filter');
                el.style.removeProperty('filter');
                el.style.removeProperty('box-shadow');
                el.style.removeProperty('text-shadow');
                el.style.removeProperty('transform');
                el.style.removeProperty('transition');
                el.style.removeProperty('animation');
                
                // Handle specific elements
                const tagName = el.tagName.toLowerCase();
                const classList = Array.from(el.classList);
                
                // Company header elements
                if (classList.includes('company-header') || el.querySelector('.company-header')) {
                  el.style.setProperty('background-color', '#ffffff', 'important');
                  el.style.setProperty('border-bottom', '2px solid #d1d5db', 'important');
                }
                
                // Table elements
                if (tagName === 'th') {
                  el.style.setProperty('background-color', '#f3f4f6', 'important');
                  el.style.setProperty('color', '#000000', 'important');
                  el.style.setProperty('border-bottom', '1px solid #d1d5db', 'important');
                }
                
                if (tagName === 'td') {
                  el.style.setProperty('background-color', '#ffffff', 'important');
                  el.style.setProperty('color', '#000000', 'important');
                  el.style.setProperty('border-top', '1px solid #d1d5db', 'important');
                }
                
                // Payment terms
                if (classList.includes('payment-terms')) {
                  el.style.setProperty('background-color', '#eff6ff', 'important');
                  el.style.setProperty('border', '1px solid #bfdbfe', 'important');
                  el.style.setProperty('color', '#1e40af', 'important');
                }
                
                // Total row
                if (classList.includes('total-row')) {
                  el.style.setProperty('background-color', '#fef3c7', 'important');
                  el.style.setProperty('border-top', '2px solid #9ca3af', 'important');
                }
                
                // Card elements
                if (classList.includes('card')) {
                  el.style.setProperty('background-color', '#ffffff', 'important');
                  el.style.setProperty('border', '1px solid #d1d5db', 'important');
                }
                
                // Due date
                if (classList.includes('due-date')) {
                  el.style.setProperty('color', '#dc2626', 'important');
                }
                
                // Company info
                if (classList.includes('company-info')) {
                  el.style.setProperty('color', '#6b7280', 'important');
                }
                
              } catch (error) {
                console.warn(`Error processing element ${index}:`, error);
                // Fallback: just set basic safe styles
                el.style.setProperty('background-color', '#ffffff', 'important');
                el.style.setProperty('color', '#000000', 'important');
                el.style.setProperty('font-family', 'Arial, sans-serif', 'important');
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
      
      // Create PDF with proper dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit the content properly
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate the ratio to fit the content to PDF width
      const ratio = pdfWidth / (canvasWidth / 2); // Divide by 2 because we used scale: 2
      const scaledHeight = (canvasHeight / 2) * ratio; // Divide by 2 because we used scale: 2
      
      let yPosition = 0;
      
      // If content fits on one page
      if (scaledHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
      } else {
        // Multi-page handling
        let remainingHeight = scaledHeight;
        let page = 1;
        
        while (remainingHeight > 0) {
          if (page > 1) {
            pdf.addPage();
          }
          
          const pageHeight = Math.min(pdfHeight, remainingHeight);
          const sourceY = (page - 1) * pdfHeight * (canvasHeight / scaledHeight);
          const sourceHeight = pageHeight * (canvasHeight / scaledHeight);
          
          // Create a temporary canvas for this page
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

  // Updated inline styles with proper sizing for PDF
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
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#111827'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    downloadBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: '#2563eb',
      color: '#ffffff',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px'
    },
    closeBtn: {
      padding: '8px 16px',
      backgroundColor: '#d1d5db',
      color: '#374151',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px'
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
    },
    companyHeader: {
      textAlign: 'center',
      borderBottom: '2px solid #d1d5db',
      paddingBottom: '20px',
      marginBottom: '20px',
      backgroundColor: '#ffffff'
    },
    companyName: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '6px'
    },
    companyInfo: {
      color: '#6b7280',
      fontSize: '13px',
      marginBottom: '3px'
    },
    invoiceHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      gap: '20px'
    },
    invoiceTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '8px'
    },
    invoiceDetails: {
      fontSize: '11px',
      color: '#374151'
    },
    dateInfo: {
      textAlign: 'right',
      fontSize: '11px',
      color: '#374151',
      minWidth: '120px'
    },
    dueDate: {
      color: '#dc2626',
      fontWeight: 'bold'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '24px'
    },
    card: {
      border: '1px solid #d1d5db',
      padding: '12px',
      borderRadius: '4px',
      backgroundColor: '#ffffff',
      minHeight: '100px'
    },
    cardTitle: {
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '8px'
    },
    cardContent: {
      fontSize: '11px',
      lineHeight: '1.4'
    },
    table: {
      width: '100%',
      fontSize: '11px',
      borderCollapse: 'collapse',
      tableLayout: 'fixed'
    },
    tableContainer: {
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      marginBottom: '20px'
    },
    tableHeader: {
      backgroundColor: '#f3f4f6',
      padding: '8px 10px',
      textAlign: 'left',
      fontWeight: 'bold',
      borderBottom: '1px solid #d1d5db',
      fontSize: '10px'
    },
    tableHeaderRight: {
      backgroundColor: '#f3f4f6',
      padding: '8px 10px',
      textAlign: 'right',
      fontWeight: 'bold',
      borderBottom: '1px solid #d1d5db',
      fontSize: '10px'
    },
    tableCell: {
      padding: '8px 10px',
      borderTop: '1px solid #d1d5db',
      fontSize: '10px',
      wordWrap: 'break-word'
    },
    tableCellRight: {
      padding: '8px 10px',
      borderTop: '1px solid #d1d5db',
      textAlign: 'right',
      fontSize: '10px'
    },
    totalRow: {
      borderTop: '2px solid #9ca3af',
      backgroundColor: '#fef3c7',
      fontWeight: 'bold'
    },
    totalCell: {
      padding: '10px',
      fontWeight: 'bold',
      fontSize: '11px'
    },
    totalAmount: {
      padding: '10px',
      textAlign: 'right',
      fontWeight: 'bold',
      fontSize: '12px'
    },
    paymentTerms: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '20px'
    },
    paymentTitle: {
      fontWeight: 'bold',
      marginBottom: '6px',
      color: '#1d4ed8',
      fontSize: '12px'
    },
    paymentContent: {
      fontSize: '10px',
      color: '#1e40af',
      lineHeight: '1.4'
    },
    footer: {
      textAlign: 'center',
      marginTop: '20px',
      paddingTop: '12px',
      borderTop: '1px solid #e5e7eb',
      fontSize: '9px',
      color: '#6b7280'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '12px'
    }
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        {/* Modal Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Generate Invoice</h2>
          <div style={styles.buttonGroup}>
            <button
              onClick={downloadAsPDF}
              disabled={generating}
              style={{
                ...styles.downloadBtn,
                opacity: generating ? 0.5 : 1,
                cursor: generating ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={16} />
              <span>{generating ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button onClick={onClose} style={styles.closeBtn}>
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div style={styles.content}>
          <div ref={invoiceRef} data-invoice-content style={styles.invoice}>
            {/* Company Header */}
            <div className="company-header" style={styles.companyHeader}>
              <h1 style={styles.companyName}>BESTACCORD TRANSPORTATION</h1>
            </div>

            {/* Invoice Header */}
            <div className="invoice-header" style={styles.invoiceHeader}>
              <div style={{ flex: 1 }}>
                <h2 style={styles.invoiceTitle}>INVOICE</h2>
                <div className="invoice-details" style={styles.invoiceDetails}>
                  <p style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Invoice No:</span> {invoiceNumber}</p>
                  <p style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Trip No:</span> {booking.tripNumber}</p>
                  <p><span style={{ fontWeight: 'bold' }}>Reservation ID:</span> {booking.reservationId}</p>
                </div>
              </div>
              <div className="date-info" style={styles.dateInfo}>
                <p><span style={{ fontWeight: 'bold' }}>Invoice Date:</span></p>
                <p style={{ marginBottom: '6px' }}>{formatDate(new Date())}</p>
                <p><span style={{ fontWeight: 'bold' }}>Service Date:</span></p>
                <p style={{ marginBottom: '6px' }}>{formatDate(booking.dateNeeded)}</p>
                <p><span style={{ fontWeight: 'bold' }}>Due Date:</span></p>
                <p className="due-date" style={styles.dueDate}>{formatDate(getDueDate())}</p>
              </div>
            </div>

            {/* Bill To & Service Information */}
            <div className="grid" style={styles.grid}>
              <div className="card" style={styles.card}>
                <h3 style={styles.cardTitle}>Bill To</h3>
                <div className="card-content" style={styles.cardContent}>
                  <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '6px' }}>{booking.companyName}</p>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Contact:</span> {booking.customerEstablishmentName}</p>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Consignor:</span> {booking.shipperConsignorName}</p>
                  <p><span style={{ fontWeight: 'bold' }}>Address:</span> {booking.originAddress}</p>
                </div>
              </div>
              
              <div className="card" style={styles.card}>
                <h3 style={styles.cardTitle}>Service Details</h3>
                <div className="card-content" style={styles.cardContent}>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Service:</span> Logistics & Transportation</p>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Route:</span> {booking.originAddress} → {booking.destinationAddress}</p>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Vehicle:</span> {booking.vehicleType}</p>
                  <p><span style={{ fontWeight: 'bold' }}>Area Code:</span> {booking.areaLocationCode}</p>
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={styles.sectionTitle}>Items Transported</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.tableHeader, width: '30%' }}>Product Name</th>
                      <th style={{ ...styles.tableHeader, width: '17%' }}>Quantity</th>
                      <th style={{ ...styles.tableHeader, width: '17%' }}>Weight</th>
                      <th style={{ ...styles.tableHeader, width: '18%' }}>Packages</th>
                      <th style={{ ...styles.tableHeader, width: '18%' }}>Units/Package</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.tableCell}>{booking.productName}</td>
                      <td style={styles.tableCell}>{booking.quantity?.toLocaleString()} pcs</td>
                      <td style={styles.tableCell}>{booking.grossWeight} tons</td>
                      <td style={styles.tableCell}>{booking.numberOfPackages} boxes</td>
                      <td style={styles.tableCell}>{booking.unitPerPackage} pcs/box</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicle & Team Information */}
            <div className="grid" style={styles.grid}>
              <div className="card" style={styles.card}>
                <h3 style={styles.cardTitle}>Vehicle Used</h3>
                <div className="card-content" style={styles.cardContent}>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Type:</span> {booking.vehicleType}</p>
                  <p style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>ID:</span> {booking.vehicleId}</p>
                  <p><span style={{ fontWeight: 'bold' }}>Plate:</span> {booking.plateNumber || 'N/A'}</p>
                </div>
              </div>
              
              <div className="card" style={styles.card}>
                <h3 style={styles.cardTitle}>Service Team</h3>
                <div className="card-content" style={styles.cardContent}>
                  {booking.employeeDetails && booking.employeeDetails.length > 0 ? (
                    booking.employeeDetails.map((emp, idx) => (
                      <p key={idx} style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>{emp.role}:</span> {emp.employeeName}
                      </p>
                    ))
                  ) : booking.employeeAssigned && booking.employeeAssigned.length > 0 ? (
                    booking.employeeAssigned.map((empId, idx) => (
                      <p key={idx} style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>Member:</span> {empId}
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
              <h3 style={styles.sectionTitle}>Invoice Summary</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.tableHeader, width: '70%' }}>Description</th>
                      <th className="text-right" style={{ ...styles.tableHeaderRight, width: '30%' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.tableCell}>Transportation Service Fee</td>
                      <td className="text-right" style={styles.tableCellRight}>{formatCurrency(booking.deliveryFee)}</td>
                    </tr>
                    <tr>
                      <td style={styles.tableCell}>Area Rate Charge</td>
                      <td className="text-right" style={styles.tableCellRight}>{formatCurrency(booking.rateCost)}</td>
                    </tr>
                    <tr className="total-row" style={styles.totalRow}>
                      <td style={styles.totalCell}>TOTAL AMOUNT DUE</td>
                      <td className="text-right" style={styles.totalAmount}>
                        {formatCurrency(
                          (booking.deliveryFee || 0) + 
                          (booking.rateCost || 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="footer" style={styles.footer}>
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