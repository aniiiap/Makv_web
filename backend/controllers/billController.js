const Bill = require('../models/Bill');
const TaskManagerTeam = require('../models/taskManager.Team');
const TaskManagerTask = require('../models/taskManager.Task');
const Client = require('../models/Client');
const Document = require('../models/Document');
const User = require('../models/User'); // Required to link the document uploader (the taskflow user's email) 
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const { sendEmail } = require('../utils/taskManager.emailService');
const { Readable } = require('stream');
const logoBase64 = require('../utils/logoBase64');
const signatureBase64 = require('../utils/signatureBase64');

const generatePDF = async (billData) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  // Create HTML content for the bill - EXACT FORMAT MATCH
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #000; padding: 20px; }
        .container { width: 100%; border: 1px solid #000; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 4px; vertical-align: top; }
        .no-border-top { border-top: none; }
        .no-border-bottom { border-bottom: none; }
        .no-border-left { border-left: none; }
        .no-border-right { border-right: none; }
        .no-border { border: none; }
        
        .header-title { font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 5px; }
        .bold { font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Grid Layout helpers */
        .half-width { width: 50%; }
        .quarter-width { width: 25%; }
        
        .small-label { font-size: 10px; margin-bottom: 2px; }
        .company-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
        
        .items-header td { font-weight: bold; text-align: center; background-color: #f9f9f9; }
        .tax-header td { font-weight: bold; text-align: center; font-size: 10px; }
        
        .signature-box { height: 60px; display: flex; align-items: flex-end; justify-content: flex-end; }
        
        /* Specific column widths for items table */
        .col-desc { }
        .col-hsn { width: 80px; text-align: center; }
        .col-amt { width: 100px; text-align: right; }
        
        .amount-word { font-weight: bold; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header-title">Tax Invoice</div>
      
      <div class="container">
        <!-- Top Section -->
        <table style="border: none;">
          <tr>
            <td class="half-width" rowspan="3" style="border-bottom: 1px solid #000; vertical-align: top; padding-right: 15px;">
              <table style="border: none; width: 100%;">
                <tr>
                  <td style="width: 80px; border: 1px solid #ccc; border-radius: 8px; vertical-align: middle; padding: 4px; text-align: center;">
                    <img src="${logoBase64}" style="width: 70px; mix-blend-mode: multiply;" />
                  </td>
                  <td style="border: none; vertical-align: top; padding-left: 10px;">
                    <div class="company-name">M A K V & ASSOCIATES</div>
                    <div>Mumbai: Ahmedabad: Bhilwara</div>
                    <div>PAN No. AATFK3007C</div>
                    <div>GSTIN/UIN: 27AATFK3007C1ZI</div>
                    <div>State Name : Maharashtra, Code : 27</div>
                  </td>
                </tr>
              </table>
            </td>
            <td class="quarter-width">
              <div class="small-label">Invoice No.</div>
              <div class="bold">${billData.invoiceNo}</div>
            </td>
            <td class="quarter-width">
              <div class="small-label">Dated</div>
              <div class="bold">${new Date(billData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="small-label">Delivery Note</div>
              <div>${billData.deliveryNote || '&nbsp;'}</div>
            </td>
            <td>
              <div class="small-label">Mode/Terms of Payment</div>
              <div>${billData.modeOfPayment || '&nbsp;'}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="small-label">Reference No. & Date.</div>
              <div>${billData.referenceNo || '&nbsp;'}</div>
            </td>
            <td>
              <div class="small-label">Other References</div>
              <div>${billData.otherReferences || '&nbsp;'}</div>
            </td>
          </tr>
          <tr>
             <!-- Buyer Details isolated cell matching screenshot -->
             <td rowspan="4" class="half-width" style="border-right: 1px solid #000; border-bottom: none; vertical-align: top;">
                <div class="small-label">Buyer (Bill to)</div>
                <div class="bold" style="font-size: 12px; margin-bottom: 4px;">${billData.buyerDetails.name}</div>
                <div style="margin-bottom: 4px;">${billData.buyerDetails.address}</div>
                ${billData.buyerDetails.gstin ? '<div>GSTIN/UIN : ' + billData.buyerDetails.gstin + '</div>' : ''}
                ${billData.buyerDetails.stateCode ? '<div>State Code : ' + billData.buyerDetails.stateCode + '</div>' : ''}
             </td>
             <td>
              <div class="small-label">Buyer's Order No.</div>
              <div>${billData.buyersOrderNo || '&nbsp;'}</div>
             </td>
             <td>
              <div class="small-label">Dated</div>
              <div>${billData.buyersOrderDate ? new Date(billData.buyersOrderDate).toLocaleDateString('en-GB') : '&nbsp;'}</div>
             </td>
          </tr>
          <tr>
             <td>
              <div class="small-label">Dispatch Doc No.</div>
              <div>${billData.dispatchDocNo || '&nbsp;'}</div>
             </td>
             <td>
              <div class="small-label">Delivery Note Date</div>
              <div>${billData.deliveryNoteDate ? new Date(billData.deliveryNoteDate).toLocaleDateString('en-GB') : '&nbsp;'}</div>
             </td>
          </tr>
           <tr>
             <td>
              <div class="small-label">Dispatched through</div>
              <div>${billData.dispatchedThrough || '&nbsp;'}</div>
             </td>
             <td>
              <div class="small-label">Destination</div>
              <div>${billData.destination || '&nbsp;'}</div>
             </td>
          </tr>
           <tr>
             <td colspan="2">
              <div class="small-label">Terms of Delivery</div>
              <div>${billData.termsOfDelivery || '&nbsp;'}</div>
              <br>
             </td>
          </tr>
        </table>

        <!-- Items Section -->
        <table>
          <tr class="items-header">
            <td class="col-desc">Particulars</td>
            <td class="col-hsn">HSN/SAC</td>
            <td class="col-amt">Amount</td>
          </tr>
          
          <!-- Items Loop -->
          ${billData.items.map((item, index) => `
            <tr style="border-bottom: none;">
              <td class="col-desc no-border-bottom">
                <div class="bold">${item.description}</div>
                ${index === 0 ? '<div style="font-style: italic; margin-top: 2px;">PROFESSIONAL CHARGES FOR THE MONTH OF ' + new Date(billData.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase() + '</div>' : ''}
                ${billData.taxDetails.isMaharashtra ? `
                <div style="text-align: right; margin-top: 10px;">Output Cgst</div>
                <div style="text-align: right;">Output Sgst</div>
                ` : `
                <div style="text-align: right; margin-top: 10px;">Output Igst</div>
                `}
              </td>
              <td class="col-hsn no-border-bottom">
                <div>${item.hsn || ''}</div>
                <br><br>
              </td>
              <td class="col-amt no-border-bottom">
                <div class="bold">${item.amount.toFixed(2)}</div>
                ${billData.taxDetails.isMaharashtra ? `
                <div style="margin-top: 10px;">${(item.amount * (item.taxRate / 2) / 100).toFixed(2)}</div>
                <div>${(item.amount * (item.taxRate / 2) / 100).toFixed(2)}</div>
                ` : `
                <div style="margin-top: 10px;">${(item.amount * item.taxRate / 100).toFixed(2)}</div>
                `}
              </td>
            </tr>
          `).join('')}
          
          <!-- Spacer to fill height if few items -->
          <tr style="height: 100px;">
             <td class="no-border-top no-border-bottom"></td>
             <td class="no-border-top no-border-bottom"></td>
             <td class="no-border-top no-border-bottom"></td>
          </tr>

          <!-- Total Row -->
          <tr>
            <td class="text-right no-border-right" style="border-top: 1px solid #000;">Total</td>
            <td style="border-left: none; border-top: 1px solid #000;"></td>
            <td class="col-amt bold" style="border-top: 1px solid #000;">₹ ${billData.taxDetails.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <!-- Amount in Words -->
        <table style="border-top: none;">
          <tr>
            <td colspan="3" style="border-top: none; border-bottom: 1px solid #000;">
              <div class="small-label">Amount Chargeable (in words)</div>
              <div class="amount-word">INR ${billData.amountInWords}</div>
            </td>
            <td class="text-right" style="border-top: none; border-bottom: 1px solid #000; font-style: italic; font-size: 10px;">E. & O.E</td>
          </tr>
        </table>

        <!-- Tax Breakdown Table -->
        <table>
          ${billData.taxDetails.isMaharashtra ? `
          <tr class="tax-header">
            <td rowspan="2">HSN/SAC</td>
            <td rowspan="2">Taxable Value</td>
            <td colspan="2">Central Tax</td>
            <td colspan="2">State Tax</td>
            <td rowspan="2">Total Tax Amount</td>
          </tr>
          <tr class="tax-header">
            <td>Rate</td>
            <td>Amount</td>
            <td>Rate</td>
            <td>Amount</td>
          </tr>
          ${billData.items.map(item => `
          <tr>
             <td>${item.hsn || ''}</td>
             <td class="text-right">${item.amount.toFixed(2)}</td>
             <td class="text-right">${item.taxRate / 2}%</td>
             <td class="text-right">${(item.amount * (item.taxRate / 2) / 100).toFixed(2)}</td>
             <td class="text-right">${item.taxRate / 2}%</td>
             <td class="text-right">${(item.amount * (item.taxRate / 2) / 100).toFixed(2)}</td>
             <td class="text-right">${(item.amount * item.taxRate / 100).toFixed(2)}</td>
          </tr>
          `).join('')}
          <tr class="bold">
             <td class="text-right">Total</td>
             <td class="text-right">${billData.taxDetails.taxableAmount.toFixed(2)}</td>
             <td></td>
             <td class="text-right">${billData.taxDetails.cgst.toFixed(2)}</td>
             <td></td>
             <td class="text-right">${billData.taxDetails.sgst.toFixed(2)}</td>
             <td class="text-right">${(billData.taxDetails.cgst + billData.taxDetails.sgst).toFixed(2)}</td>
          </tr>
          ` : `
          <tr class="tax-header">
            <td rowspan="2">HSN/SAC</td>
            <td rowspan="2">Taxable Value</td>
            <td colspan="2">Integrated Tax</td>
            <td rowspan="2">Total Tax Amount</td>
          </tr>
          <tr class="tax-header">
            <td>Rate</td>
            <td>Amount</td>
          </tr>
          ${billData.items.map(item => `
          <tr>
             <td>${item.hsn || ''}</td>
             <td class="text-right">${item.amount.toFixed(2)}</td>
             <td class="text-right">${item.taxRate}%</td>
             <td class="text-right">${(item.amount * item.taxRate / 100).toFixed(2)}</td>
             <td class="text-right">${(item.amount * item.taxRate / 100).toFixed(2)}</td>
          </tr>
          `).join('')}
          <tr class="bold">
             <td class="text-right">Total</td>
             <td class="text-right">${billData.taxDetails.taxableAmount.toFixed(2)}</td>
             <td></td>
             <td class="text-right">${billData.taxDetails.igst.toFixed(2)}</td>
             <td class="text-right">${billData.taxDetails.igst.toFixed(2)}</td>
          </tr>
          `}
        </table>
        
        <!-- Tax Amount in Words & Footer -->
        <table style="border-top: none;">
           <tr>
             <td style="border-top: none; vertical-align: top; height: 120px; padding: 10px;">
                <div class="small-label">Tax Amount (in words) :</div>
                <div class="bold" style="margin-top: 5px; margin-bottom: 20px;">${billData.taxAmountInWords || billData.amountInWords}</div>
                
                <div class="small-label" style="margin-bottom: 4px;">Company's Bank Details</div>
                <table style="width: auto; border: none; font-size: 11px;">
                   <tr>
                      <td style="border: none; padding: 1px 15px 1px 0px;">Bank Name</td>
                      <td style="border: none; padding: 1px;">:</td>
                      <td style="border: none; padding: 1px;" class="bold">INDUSLND BANK 1785</td>
                   </tr>
                   <tr>
                      <td style="border: none; padding: 1px 15px 1px 0px;">A/c No.</td>
                      <td style="border: none; padding: 1px;">:</td>
                      <td style="border: none; padding: 1px;" class="bold">201002551785</td>
                   </tr>
                   <tr>
                      <td style="border: none; padding: 1px 15px 1px 0px;">Branch & IFS Code</td>
                      <td style="border: none; padding: 1px;">:</td>
                      <td style="border: none; padding: 1px;" class="bold">INDB0000133</td>
                   </tr>
                </table>
             </td>
             <td style="border-top: 1px solid #000; border-left: 1px solid #000; width: 40%; vertical-align: bottom; padding: 0;">
                <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 4px; position: relative;">
                   <div class="text-right bold">for M A K V & ASSOCIATES</div>
                   <img src="${signatureBase64}" style="width: 120px; mix-blend-mode: multiply; position: absolute; bottom: 15px; right: 10px;" alt="Signature"/>
                   <div class="text-right" style="margin-top: 60px;">Authorised Signatory</div>
                </div>
             </td>
           </tr>
        </table>
        
        <div class="text-center" style="margin-top: 5px; font-size: 10px;">This is a Computer Generated Invoice</div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px'
    }
  });
  await browser.close();
  return pdfBuffer;
};

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, invoiceNo) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto', // Allow Cloudinary to detect PDF
        folder: 'bills',
        public_id: `Invoice-${invoiceNo}-${Date.now()}`, // Unique ID
        format: 'pdf',
        flags: 'attachment:false' // Default to inline view
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          reject(error);
        } else resolve(result);
      }
    );
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
};

exports.createBill = async (req, res) => {
  try {
    console.log('Starting bill generation...');
    const billData = req.body;

    // Handle empty team string (for Personal bills)
    if (!billData.team) {
      delete billData.team;
    }

    if (!req.user || !req.user._id) {
      console.error('User authentication failed: req.user is missing');
      return res.status(401).json({ message: 'User authentication failed' });
    }
    billData.generatedBy = req.user._id;
    console.log('User authenticated:', req.user._id);

    // Auto-generate invoiceNo: MAKV/2026-02/00X
    const currentDate = new Date(billData.date || Date.now());
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `MAKV/${year}-${month}/`;

    // Find latest bill in this month
    const latestBill = await Bill.findOne({
      invoiceNo: { $regex: `^${prefix}` }
    }).sort({ invoiceNo: -1 });

    let sequence = 1;
    if (latestBill && latestBill.invoiceNo) {
      const parts = latestBill.invoiceNo.split('/');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
    const formattedSequence = String(sequence).padStart(3, '0');
    billData.invoiceNo = `${prefix}${formattedSequence}`;
    console.log('Generated Invoice Number:', billData.invoiceNo);

    // 1. Generate PDF
    console.log('Step 1: Generating PDF...');
    let pdfBuffer;
    try {
      pdfBuffer = await generatePDF(billData);
      console.log('PDF Generated successfully. Buffer size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('Puppeteer/PDF Error:', pdfError);
      throw new Error(`PDF Generation Failed: ${pdfError.message}`);
    }

    // 2. Upload to Cloudinary
    console.log('Step 2: Uploading to Cloudinary...');
    let uploadResult;
    try {
      // Sanitize invoice no for public_id to avoid weird directory structures if undesired, 
      // though / is allowed. Let's just be safe.
      const safeInvoiceNo = billData.invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');

      uploadResult = await uploadToCloudinary(pdfBuffer, safeInvoiceNo);
      console.log('Cloudinary Upload successful. URL:', uploadResult.secure_url);
      billData.pdfUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error('Cloudinary Upload Error:', uploadError);
      console.error('Cloudinary Config:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
      });
      throw new Error(`Cloudinary Upload Failed: ${uploadError.message}`);
    }

    // 3. Save to DB
    console.log('Step 3: Saving to Database...');
    const newBill = new Bill(billData);
    await newBill.save();
    console.log('Bill saved to database with ID:', newBill._id);

    // 4. Send Email
    console.log('Step 4: Sending Email to:', billData.sentToEmail);
    try {
      const emailResult = await sendEmail({
        email: billData.sentToEmail,
        subject: `Invoice Generated: ${billData.invoiceNo}`,
        message: `Please find attached the invoice ${billData.invoiceNo}.\n\nYou can also download it directly from here: ${billData.pdfUrl}`,
        attachments: [
          {
            filename: `Invoice-${billData.invoiceNo}.pdf`,
            path: billData.pdfUrl,
          },
        ],
      });
      console.log('Email sent result:', emailResult);
    } catch (emailError) {
      console.error('Email Sending Warning:', emailError);
      // Don't fail the request if email fails, but log it
    }

    // 5. Update Task isBillable if taskId provided
    if (billData.taskId) {
      console.log('Step 5: Updating original task status...');
      try {
        await TaskManagerTask.findByIdAndUpdate(billData.taskId, { isBillable: true });
        console.log(`Task ${billData.taskId} marked as billable`);
      } catch (taskErr) {
        console.error('Failed to mark task as billable:', taskErr);
      }
    }

    // 6. Attach PDF to Office Client Documents
    if (billData.buyerDetails && billData.buyerDetails.clientId) {
      console.log('Step 6: Attaching document to client dashboard...');
      try {
        // We need an Office User ID (uploadedBy) for the document. 
        // We'll try to find the office user who matches the Task Manager user's email.
        const officeUser = await User.findOne({ email: req.user.email });
        if (officeUser) {
          const doc = new Document({
            clientId: billData.buyerDetails.clientId,
            fileName: `${billData.invoiceNo}.pdf`.replace(/\//g, '_'),
            originalName: `Invoice-${billData.invoiceNo}.pdf`.replace(/\//g, '_'),
            cloudinaryUrl: billData.pdfUrl,
            fileType: 'application/pdf',
            fileSize: pdfBuffer ? pdfBuffer.length : 0,
            documentType: 'invoice',
            uploadedBy: officeUser._id,
            description: `Generated from Task Manager (Auto-attached)`
          });
          await doc.save();
          console.log(`Document saved to client ${billData.buyerDetails.clientId}`);
        } else {
          console.warn(`Could not attach document: No office user found with email ${req.user.email}`);
        }
      } catch (clientDocErr) {
        console.error('Failed to attach document to client dashboard:', clientDocErr);
      }
    }

    console.log('Bill generation workflow completed successfully.');
    res.status(201).json({ message: 'Bill generated successfully', bill: newBill });
  } catch (error) {
    console.error('CRITICAL ERROR in createBill:', error);
    // Return the specific error message to the client for debugging
    res.status(500).json({ message: 'Error creating bill', error: error.message, stack: error.stack });
  }
};



// ... imports

exports.getBills = async (req, res) => {
  try {
    // All bills visible to all authenticated members
    const bills = await Bill.find()
      .sort({ createdAt: -1 })
      .populate('team', 'name');

    res.status(200).json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
};

exports.getClientsForBilling = async (req, res) => {
  try {
    // Fetch active clients from the office dashboard
    // We only need basic details for the dropdown and auto-filling
    const clients = await Client.find({ status: 'active' })
      .select('name address email gstin stateCode clientId')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients for billing:', error);
    res.status(500).json({ message: 'Error fetching clients', error: error.message });
  }
};

exports.getPaySlips = async (req, res) => {
  try {
    const payslips = await Document.find({ documentType: 'payslip' })
      .sort({ uploadedAt: -1 })
      .populate('clientId', 'name email clientId')
      .populate('uploadedBy', 'name email');
    res.status(200).json(payslips);
  } catch (error) {
    console.error('Error fetching pay slips:', error);
    res.status(500).json({ message: 'Error fetching pay slips', error: error.message });
  }
};

// ======================== HUF BILL ========================

const generateHUFPDF = async (billData) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #000; padding: 20px; }
        .container { width: 100%; border: 1px solid #000; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 4px; vertical-align: top; }
        .no-border-top { border-top: none; }
        .no-border-bottom { border-bottom: none; }
        .no-border-left { border-left: none; }
        .no-border-right { border-right: none; }
        .no-border { border: none; }
        
        .header-title { font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 5px; }
        .bold { font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .half-width { width: 50%; }
        .quarter-width { width: 25%; }
        
        .small-label { font-size: 10px; margin-bottom: 2px; }
        .company-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
        
        .items-header td { font-weight: bold; text-align: center; background-color: #f9f9f9; }
        
        .amount-word { font-weight: bold; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header-title">INVOICE</div>
      
      <div class="container">
        <!-- Top Section -->
        <table style="border: none;">
          <tr>
            <td class="half-width" rowspan="3" style="border-bottom: 1px solid #000; vertical-align: top; padding-right: 15px;">
              <div class="company-name">MURLI ATAL HUF</div>
              <div>Mumbai: Ahmedabad: Bhilwara</div>
            </td>
            <td class="quarter-width">
              <div class="small-label">Invoice No.</div>
              <div class="bold">${billData.invoiceNo}</div>
            </td>
            <td class="quarter-width">
              <div class="small-label">Dated</div>
              <div class="bold">${new Date(billData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="small-label">Delivery Note</div>
              <div>${billData.deliveryNote || '&nbsp;'}</div>
            </td>
            <td>
              <div class="small-label">Mode/Terms of Payment</div>
              <div>${billData.modeOfPayment || '&nbsp;'}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div class="small-label">Reference No. & Date.</div>
              <div>${billData.referenceNo || '&nbsp;'}</div>
            </td>
            <td>
              <div class="small-label">Other References</div>
              <div>${billData.otherReferences || '&nbsp;'}</div>
            </td>
          </tr>
          <tr>
             <td rowspan="4" class="half-width" style="border-right: 1px solid #000; border-bottom: none; vertical-align: top;">
                <div class="small-label">Buyer (Bill to)</div>
                <div class="bold" style="font-size: 12px; margin-bottom: 4px;">${billData.buyerDetails.name}</div>
                <div style="margin-bottom: 4px;">${billData.buyerDetails.address}</div>
             </td>
             <td>
              <div class="small-label">Buyer's Order No.</div>
              <div>${billData.buyersOrderNo || '&nbsp;'}</div>
             </td>
             <td>
              <div class="small-label">Dated</div>
              <div>${billData.buyersOrderDate ? new Date(billData.buyersOrderDate).toLocaleDateString('en-GB') : '&nbsp;'}</div>
             </td>
          </tr>
          <tr>
             <td>
              <div class="small-label">Dispatch Doc No.</div>
              <div>${billData.dispatchDocNo || '&nbsp;'}</div>
             </td>
             <td>
              <div class="small-label">Delivery Note Date</div>
              <div>${billData.deliveryNoteDate ? new Date(billData.deliveryNoteDate).toLocaleDateString('en-GB') : '&nbsp;'}</div>
             </td>
          </tr>
           <tr>
             <td>
              <div class="small-label">Dispatched through</div>
              <div>${billData.dispatchedThrough || '&nbsp;'}</div>
             </td>
             <td>
              <div class="small-label">Destination</div>
              <div>${billData.destination || '&nbsp;'}</div>
             </td>
          </tr>
           <tr>
             <td colspan="2">
              <div class="small-label">Terms of Delivery</div>
              <div>${billData.termsOfDelivery || '&nbsp;'}</div>
              <br>
             </td>
          </tr>
        </table>

        <!-- Items Section -->
        <table>
          <tr class="items-header">
            <td style="width: 70%;">Particulars</td>
            <td style="width: 30%; text-align: right;">Amount</td>
          </tr>
          
          ${billData.items.map(item => `
            <tr style="border-bottom: none;">
              <td class="no-border-bottom">
                <div class="bold">${item.description}</div>
                ${item.subDescription ? '<div style="font-style: italic; margin-top: 2px;">' + item.subDescription + '</div>' : ''}
              </td>
              <td class="no-border-bottom text-right">
                <div class="bold">${parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </td>
            </tr>
          `).join('')}
          
          <!-- Spacer -->
          <tr style="height: 120px;">
             <td class="no-border-top no-border-bottom"></td>
             <td class="no-border-top no-border-bottom"></td>
          </tr>

          <!-- Total Row -->
          <tr>
            <td class="text-right" style="border-top: 1px solid #000;">Total</td>
            <td class="text-right bold" style="border-top: 1px solid #000;">₹ ${billData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <!-- Amount in Words -->
        <table style="border-top: none;">
          <tr>
            <td style="border-top: none; border-bottom: 1px solid #000;">
              <div class="small-label">Amount Chargeable (in words)</div>
              <div class="amount-word">${billData.amountInWords}</div>
            </td>
            <td class="text-right" style="border-top: none; border-bottom: 1px solid #000; font-style: italic; font-size: 10px; width: 80px;">E. & O.E</td>
          </tr>
        </table>
        
        <!-- Footer: Bank Details + Signature -->
        <table style="border-top: none;">
           <tr>
             <td style="border-top: none; vertical-align: bottom; height: 140px; padding: 10px;">
                <div class="small-label" style="margin-bottom: 4px;">Company's Bank Details</div>
                <table style="width: auto; border: none; font-size: 11px;">
                   <tr>
                      <td style="border: none; padding: 1px 15px 1px 0px;">Bank Name</td>
                      <td style="border: none; padding: 1px;">:</td>
                      <td style="border: none; padding: 1px;" class="bold">AU SMALL FINANCE BANK</td>
                   </tr>
                   <tr>
                      <td style="border: none; padding: 1px 15px 1px 0px;">A/c No.</td>
                      <td style="border: none; padding: 1px;">:</td>
                      <td style="border: none; padding: 1px;" class="bold">2301223148625449</td>
                   </tr>
                   <tr>
                      <td style="border: none; padding: 1px 15px 1px 0px;">Branch & IFS Code</td>
                      <td style="border: none; padding: 1px;">:</td>
                      <td style="border: none; padding: 1px;" class="bold">AUBL0002231</td>
                   </tr>
                </table>
             </td>
             <td style="border-top: 1px solid #000; border-left: 1px solid #000; width: 40%; vertical-align: bottom; padding: 0;">
                <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 4px; position: relative;">
                   <div class="text-right bold">for MURLI ATAL HUF</div>
                   <img src="${signatureBase64}" style="width: 120px; mix-blend-mode: multiply; position: absolute; bottom: 15px; right: 10px;" alt="Signature"/>
                   <div class="text-right" style="margin-top: 60px;">Authorised Signatory</div>
                </div>
             </td>
           </tr>
        </table>
        
        <div class="text-center" style="margin-top: 5px; font-size: 10px;">This is a Computer Generated Invoice</div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px'
    }
  });
  await browser.close();
  return pdfBuffer;
};

exports.createHUFBill = async (req, res) => {
  try {
    console.log('Starting HUF bill generation...');
    const billData = req.body;

    // Handle empty team string
    if (!billData.team) {
      delete billData.team;
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User authentication failed' });
    }
    billData.generatedBy = req.user._id;

    // Auto-generate invoiceNo: HUF/YYYY-MM/00X
    const currentDate = new Date(billData.date || Date.now());
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `HUF/${year}-${month}/`;

    const latestBill = await Bill.findOne({
      invoiceNo: { $regex: `^${prefix}` }
    }).sort({ invoiceNo: -1 });

    let sequence = 1;
    if (latestBill && latestBill.invoiceNo) {
      const parts = latestBill.invoiceNo.split('/');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }
    const formattedSequence = String(sequence).padStart(3, '0');
    billData.invoiceNo = `${prefix}${formattedSequence}`;
    console.log('Generated HUF Invoice Number:', billData.invoiceNo);

    // Calculate total
    const totalAmount = billData.items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    billData.totalAmount = totalAmount;

    // Store taxDetails for DB compatibility (no tax for HUF)
    billData.taxDetails = {
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: totalAmount,
      taxableAmount: totalAmount
    };

    // 1. Generate PDF
    console.log('HUF Step 1: Generating PDF...');
    let pdfBuffer;
    try {
      pdfBuffer = await generateHUFPDF(billData);
      console.log('HUF PDF generated. Buffer size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('HUF PDF Error:', pdfError);
      throw new Error(`HUF PDF Generation Failed: ${pdfError.message}`);
    }

    // 2. Upload to Cloudinary
    console.log('HUF Step 2: Uploading to Cloudinary...');
    let uploadResult;
    try {
      const safeInvoiceNo = billData.invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
      uploadResult = await uploadToCloudinary(pdfBuffer, safeInvoiceNo);
      console.log('HUF Cloudinary Upload. URL:', uploadResult.secure_url);
      billData.pdfUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error('HUF Cloudinary Error:', uploadError);
      throw new Error(`HUF Cloudinary Upload Failed: ${uploadError.message}`);
    }

    // 3. Save to DB
    console.log('HUF Step 3: Saving to Database...');
    const newBill = new Bill(billData);
    await newBill.save();
    console.log('HUF Bill saved with ID:', newBill._id);

    // 4. Send Email
    if (billData.sentToEmail) {
      console.log('HUF Step 4: Sending Email to:', billData.sentToEmail);
      try {
        await sendEmail({
          email: billData.sentToEmail,
          subject: `Invoice Generated: ${billData.invoiceNo}`,
          message: `Please find attached the invoice ${billData.invoiceNo}.\n\nYou can also download it directly from here: ${billData.pdfUrl}`,
          attachments: [
            {
              filename: `Invoice-${billData.invoiceNo}.pdf`,
              path: billData.pdfUrl,
            },
          ],
        });
      } catch (emailError) {
        console.error('HUF Email Warning:', emailError);
      }
    }

    console.log('HUF Bill generation completed successfully.');

    // 5. Attach to client dashboard (if buyer has clientId)
    if (billData.buyerDetails && billData.buyerDetails.clientId) {
      try {
        const officeUser = await User.findOne({ email: req.user.email });
        if (officeUser) {
          const doc = new Document({
            clientId: billData.buyerDetails.clientId,
            fileName: `${billData.invoiceNo}.pdf`.replace(/\//g, '_'),
            originalName: `HUF-Invoice-${billData.invoiceNo}.pdf`.replace(/\//g, '_'),
            cloudinaryUrl: billData.pdfUrl,
            fileType: 'application/pdf',
            fileSize: pdfBuffer ? pdfBuffer.length : 0,
            documentType: 'huf-invoice',
            uploadedBy: officeUser._id,
            description: `HUF Invoice (Auto-attached)`
          });
          await doc.save();
          console.log(`HUF document saved to client ${billData.buyerDetails.clientId}`);
        }
      } catch (docErr) {
        console.error('Failed to attach HUF doc to client:', docErr);
      }
    }

    res.status(201).json({ message: 'HUF Bill generated successfully', bill: newBill });
  } catch (error) {
    console.error('CRITICAL ERROR in createHUFBill:', error);
    res.status(500).json({ message: 'Error creating HUF bill', error: error.message, stack: error.stack });
  }
};

// ======================== PAY SLIP ========================

const generatePaySlipPDF = async (data) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000; padding: 30px; }
        .container { width: 100%; border: 2px solid #000; padding: 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        .no-border { border: none; }
        .bold { font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .header { background-color: #f0f0f0; }
        .title { font-size: 18px; font-weight: bold; text-align: center; padding: 12px; border-bottom: 2px solid #000; }
        .company-section { padding: 15px; border-bottom: 2px solid #000; }
        .company-name { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
        .company-detail { font-size: 11px; color: #333; }
        .receipt-title { font-size: 14px; font-weight: bold; text-align: center; padding: 8px; background: #e8e8e8; border-bottom: 1px solid #000; }
        .label { font-weight: bold; width: 35%; background-color: #fafafa; }
        .value { width: 65%; }
        .amount-box { font-size: 16px; font-weight: bold; }
        .footer-section { padding: 10px 15px; }
        .signature-area { height: 80px; position: relative; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Company Header -->
        <div class="company-section">
          <table style="border: none; width: 100%;">
            <tr>
              <td style="border: none; width: 80px; vertical-align: middle; padding: 4px; text-align: center;">
                <img src="${logoBase64}" style="width: 65px; mix-blend-mode: multiply;" />
              </td>
              <td style="border: none; vertical-align: top; padding-left: 10px;">
                <div class="company-name">M A K V & ASSOCIATES</div>
                <div class="company-detail">Chartered Accountants</div>
                <div class="company-detail">Mumbai | Ahmedabad | Bhilwara</div>
              </td>
              <td style="border: none; text-align: right; vertical-align: top;">
                <div style="font-size: 10px; color: #666;">Receipt No.</div>
                <div class="bold" style="font-size: 13px;">${data.receiptNo}</div>
                <div style="font-size: 10px; color: #666; margin-top: 5px;">Date</div>
                <div class="bold">${new Date(data.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Title -->
        <div class="receipt-title">PAYMENT RECEIPT</div>

        <!-- Client Details -->
        <table>
          <tr>
            <td class="label">Received From</td>
            <td class="value bold" style="font-size: 13px;">${data.clientName}</td>
          </tr>
          <tr>
            <td class="label">Address</td>
            <td class="value">${data.clientAddress}</td>
          </tr>
        </table>

        <!-- Payment Details -->
        <div class="receipt-title" style="font-size: 12px;">Payment Details</div>
        <table>
          <tr>
            <td class="label">Payment Date</td>
            <td class="value">${new Date(data.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td class="label">Payment Method</td>
            <td class="value">${data.paymentMethod}</td>
          </tr>
          ${data.transactionId ? `
          <tr>
            <td class="label">Transaction / Reference ID</td>
            <td class="value bold">${data.transactionId}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Description</td>
            <td class="value">${data.description || 'Professional Services'}</td>
          </tr>
          <tr style="background-color: #f8f8f8;">
            <td class="label" style="font-size: 14px;">Amount Received</td>
            <td class="value amount-box">₹ ${parseFloat(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td class="label">Amount in Words</td>
            <td class="value bold" style="font-style: italic;">${data.amountInWords}</td>
          </tr>
        </table>

        ${data.remarks ? `
        <table>
          <tr>
            <td class="label">Remarks</td>
            <td class="value">${data.remarks}</td>
          </tr>
        </table>` : ''}

        <!-- Footer: Bank + Signature -->
        <table style="border-top: 2px solid #000;">
          <tr>
            <td style="vertical-align: bottom; padding: 12px; border-right: 1px solid #000;">
              <div style="font-size: 10px; font-weight: bold; margin-bottom: 6px;">Company's Bank Details</div>
              <table style="width: auto; border: none; font-size: 11px;">
                <tr>
                  <td style="border: none; padding: 1px 12px 1px 0;">Bank Name</td>
                  <td style="border: none; padding: 1px;">:</td>
                  <td style="border: none; padding: 1px;" class="bold">INDUSIND BANK 1785</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px 12px 1px 0;">A/c No.</td>
                  <td style="border: none; padding: 1px;">:</td>
                  <td style="border: none; padding: 1px;" class="bold">201002551785</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px 12px 1px 0;">Branch & IFS Code</td>
                  <td style="border: none; padding: 1px;">:</td>
                  <td style="border: none; padding: 1px;" class="bold">INDB0000133</td>
                </tr>
              </table>
            </td>
            <td style="width: 40%; vertical-align: bottom; padding: 0;">
              <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 6px; position: relative;">
                <div class="text-right bold">for M A K V & ASSOCIATES</div>
                <img src="${signatureBase64}" style="width: 120px; mix-blend-mode: multiply; position: absolute; bottom: 18px; right: 12px;" alt="Signature"/>
                <div class="text-right" style="margin-top: 60px;">Authorised Signatory</div>
              </div>
            </td>
          </tr>
        </table>

        <div class="text-center" style="padding: 6px; font-size: 10px; border-top: 1px solid #000;">This is a Computer Generated Receipt</div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });
  await browser.close();
  return pdfBuffer;
};

exports.createPaySlip = async (req, res) => {
  try {
    console.log('Starting Pay Slip generation...');
    const data = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User authentication failed' });
    }

    // Auto-generate receipt number: PS/YYYY-MM/00X
    const currentDate = new Date(data.paymentDate || Date.now());
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `PS/${year}-${month}/`;

    // Find latest payslip document to determine sequence
    const latestDoc = await Document.findOne({
      documentType: 'payslip',
      fileName: { $regex: `^PaySlip-PS_${year}-${month}` }
    }).sort({ uploadedAt: -1 });

    let sequence = 1;
    if (latestDoc && latestDoc.fileName) {
      // Extract sequence from filename like PaySlip-PS_2026-03_003.pdf
      const match = latestDoc.fileName.match(/_(\d{3})\.pdf$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }
    const formattedSequence = String(sequence).padStart(3, '0');
    data.receiptNo = `${prefix}${formattedSequence}`;
    console.log('Generated Receipt Number:', data.receiptNo);

    // Amount in words
    if (!data.amountInWords) {
      data.amountInWords = `INR ${Math.floor(parseFloat(data.amount))} Only`;
    }

    // 1. Generate PDF
    console.log('PaySlip Step 1: Generating PDF...');
    let pdfBuffer;
    try {
      pdfBuffer = await generatePaySlipPDF(data);
      console.log('PaySlip PDF generated. Buffer size:', pdfBuffer.length);
    } catch (pdfError) {
      console.error('PaySlip PDF Error:', pdfError);
      throw new Error(`PaySlip PDF Generation Failed: ${pdfError.message}`);
    }

    // 2. Upload to Cloudinary
    console.log('PaySlip Step 2: Uploading to Cloudinary...');
    let uploadResult;
    const safeReceiptNo = data.receiptNo.replace(/[^a-zA-Z0-9-_]/g, '_');
    try {
      uploadResult = await uploadToCloudinary(pdfBuffer, `PaySlip-${safeReceiptNo}`);
      console.log('PaySlip Cloudinary URL:', uploadResult.secure_url);
    } catch (uploadError) {
      console.error('PaySlip Cloudinary Error:', uploadError);
      throw new Error(`PaySlip Cloudinary Upload Failed: ${uploadError.message}`);
    }

    // 3. Save as Document to client dashboard
    console.log('PaySlip Step 3: Saving Document for client...');
    if (data.clientId) {
      try {
        const officeUser = await User.findOne({ email: req.user.email });
        if (officeUser) {
          const doc = new Document({
            clientId: data.clientId,
            fileName: `PaySlip-${safeReceiptNo}.pdf`,
            originalName: `PaySlip-${data.receiptNo}.pdf`.replace(/\//g, '_'),
            cloudinaryUrl: uploadResult.secure_url,
            fileType: 'application/pdf',
            fileSize: pdfBuffer.length,
            documentType: 'payslip',
            uploadedBy: officeUser._id,
            description: `Payment Receipt - ${data.description || 'Professional Services'} - ₹${parseFloat(data.amount).toLocaleString('en-IN')}`
          });
          await doc.save();
          console.log(`PaySlip document saved to client ${data.clientId}`);
        } else {
          console.warn(`Could not attach payslip: No office user found with email ${req.user.email}`);
        }
      } catch (docErr) {
        console.error('Failed to save payslip document:', docErr);
      }
    }

    // 4. Send Email (optional)
    if (data.sentToEmail) {
      console.log('PaySlip Step 4: Sending Email to:', data.sentToEmail);
      try {
        await sendEmail({
          email: data.sentToEmail,
          subject: `Payment Receipt: ${data.receiptNo}`,
          message: `Dear ${data.clientName},\n\nPlease find attached your payment receipt ${data.receiptNo} for ₹${parseFloat(data.amount).toLocaleString('en-IN')}.\n\nThank you for your payment.\n\nRegards,\nMAKV & Associates`,
          attachments: [
            {
              filename: `PaySlip-${data.receiptNo}.pdf`.replace(/\//g, '_'),
              path: uploadResult.secure_url,
            },
          ],
        });
      } catch (emailError) {
        console.error('PaySlip Email Warning:', emailError);
      }
    }

    console.log('Pay Slip generation completed successfully.');
    res.status(201).json({
      message: 'Pay Slip generated successfully',
      receiptNo: data.receiptNo,
      pdfUrl: uploadResult.secure_url
    });
  } catch (error) {
    console.error('CRITICAL ERROR in createPaySlip:', error);
    res.status(500).json({ message: 'Error creating pay slip', error: error.message });
  }
};
