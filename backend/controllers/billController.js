const Bill = require('../models/Bill');
const TaskManagerTeam = require('../models/taskManager.Team');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const { sendEmail } = require('../utils/taskManager.emailService');
const { Readable } = require('stream');

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
            <td class="half-width" rowspan="3" style="border-bottom: 1px solid #000; vertical-align: top;">
              <div class="company-name">M A K V & ASSOCIATES</div>
              <div>Mumbai: Ahmedabad: Bhilwara</div>
              <div>PAN No. AATFK3007C</div>
              <div>GSTIN/UIN: 27AATFK3007C1ZI</div>
              <div>State Name : Maharashtra, Code : 27</div>
              <div>E-Mail : Atalmurli@yahoo.in</div>
              <br>
              <div class="small-label">Buyer (Bill to)</div>
              <div class="bold">${billData.buyerDetails.name}</div>
              <div>${billData.buyerDetails.address}</div>
              <div>GSTIN/UIN : ${billData.buyerDetails.gstin || ''}</div>
              <div>State Name : ${billData.buyerDetails.stateCode ? 'Maharashtra' : ''}, Code : ${billData.buyerDetails.stateCode || ''}</div>
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
             <!-- Empty cell below buyer details to match height if needed, OR continue fields -->
             <td rowspan="4" style="border-right: 1px solid #000; vertical-align: top;">
                <!-- Just empty space or continued address if long -->
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
                <div style="text-align: right; margin-top: 10px;">Output Cgst</div>
                <div style="text-align: right;">Output Sgst</div>
              </td>
              <td class="col-hsn no-border-bottom">
                <div>${item.hsn || ''}</div>
                <br><br>
              </td>
              <td class="col-amt no-border-bottom">
                <div class="bold">${item.amount.toFixed(2)}</div>
                <div style="margin-top: 10px;">${(item.amount * (item.taxRate / 2) / 100).toFixed(2)}</div>
                <div>${(item.amount * (item.taxRate / 2) / 100).toFixed(2)}</div>
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
        </table>
        
        <!-- Tax Amount in Words & Footer -->
        <table style="border-top: none;">
           <tr>
             <td style="border-top: none; vertical-align: top; height: 100px;">
                <div class="small-label">Tax Amount (in words) :</div>
                <div class="bold" style="margin-top: 5px;">INR ${billData.taxAmountInWords || billData.amountInWords}</div>
             </td>
             <td style="border-top: none; width: 40%; vertical-align: bottom;">
                <div class="text-right bold" style="margin-bottom: 40px;">for M A K V & ASSOCIATES</div>
                <div class="text-right">Authorised Signatory</div>
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
    const userId = req.user._id;

    // 1. Find teams where user is a member
    const userTeams = await TaskManagerTeam.find({
      'members.user': userId,
      isActive: true
    }).select('_id');

    const teamIds = userTeams.map(t => t._id);

    // 2. Find bills that are EITHER:
    //    a) Created by the user (Personal or legacy)
    //    b) Associated with a team the user belongs to
    const bills = await Bill.find({
      $or: [
        { generatedBy: userId },
        { team: { $in: teamIds } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('team', 'name'); // Optional: populate team name if we want to show it

    res.status(200).json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
};
