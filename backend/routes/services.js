const express = require('express');
const router = express.Router();

// Services data
const services = {
  accountingAdvisory: {
    title: 'Accounting Advisory Services',
    description: 'Your business faces myriad complex accounting issues related to acquisitions, consolidations, debt and equity offerings, restatements, GAAP conversion, treasury, hedging and more.',
    services: [
      {
        id: 1,
        title: 'Tailored Accounting Solutions',
        description: 'We tailor accounting solutions to your needs, allowing for a thorough approach in anticipation of the requirements of auditors, investors and regulators',
      },
      {
        id: 2,
        title: 'Compliance Advisory',
        description: 'Advising on compliances as per emerging accounting standards',
      },
      {
        id: 3,
        title: 'IND AS, IFRS & GAAP Guidance',
        description: 'Guidance as per IND AS, IFRS and Indian GAAP',
      },
      {
        id: 4,
        title: 'Virtual CFO Services',
        description: 'Virtual CFO, Accounting supervision & Retainership Services',
      },
      {
        id: 5,
        title: 'Financial Reporting',
        description: 'Assistance and advisory in financial reporting and analysis of accounting issues',
      },
      {
        id: 6,
        title: 'Consolidated Financial Statements',
        description: 'Advising on preparation of consolidated financial statements (CFS)',
      },
      {
        id: 7,
        title: 'New Accounting Pronouncements',
        description: 'Advice on new accounting pronouncements',
      },
      {
        id: 8,
        title: 'Cloud CFO',
        description: 'Cloud-based CFO services providing real-time financial insights and strategic financial management through cloud platforms',
      },
    ],
  },
  auditAssurance: {
    title: 'Audit & Assurance',
    description: 'Audit is a critical element in the assurance environment of the organisations and a valuable tool and contributor to managing risks more effectively. It is a key attribute of good governance which provides various stake holders with an independent view on whether the organisation has an appropriate risk and control environment.',
    services: [
      {
        id: 1,
        title: 'Statutory Audit',
        description: 'Statutory Audit as per Companies Act 2013',
      },
      {
        id: 2,
        title: 'Internal Audit Services',
        description: 'Internal Audit Services',
      },
      {
        id: 3,
        title: 'SOX Compliance',
        description: 'Sarbanes-Oxley (SOX) and Internal Financial Controls Transformation and Compliance Services',
      },
      {
        id: 4,
        title: 'Process Reviews & SOPs',
        description: 'Process Reviews and Standard operating Procedures(SOPs)',
      },
      {
        id: 5,
        title: 'Internal Controls Documentation',
        description: 'Assist corporates to document and evaluate internal controls Identification of significant risks and controls for all key process areas, designing the Risk and Control matrix (Manual and automated controls) and mapping of key safeguards with supporting evidences',
      },
      {
        id: 6,
        title: 'Enterprise Risk Management',
        description: 'Enterprise Risk Management (ERM)',
      },
      {
        id: 7,
        title: 'Investigations & Special Audit',
        description: 'Investigations and Special purpose Audit',
      },
      {
        id: 8,
        title: 'Period End Reviews',
        description: 'Period end reviews & reconciliations',
      },
      {
        id: 9,
        title: 'Stock Audit',
        description: 'Stock audit / physical verification',
      },
      {
        id: 10,
        title: 'Mystery Shopping',
        description: 'Mystery shopping and stores audits',
      },
      {
        id: 11,
        title: 'Customer Service Reviews',
        description: 'Customer service centre reviews',
      },
    ],
  },
  directTaxes: {
    title: 'Direct Taxes',
    description: 'Direct tax and regulatory aspects are significant parameters in every business decision. Our services are designed to comprehensively address the entire gamut of direct tax issues relevant to businesses across industries and jurisdictions. We formalise and implement effective strategies to address specific situations throughout the business lifecycle. To effectively meet client\'s needs, we emphasise on quality, reliability and a proactive approach.',
    services: [
      {
        id: 1,
        title: 'Tax Consultancy',
        description: 'Providing consultancy services in all the areas of Direct Tax ranging from Tax Planning for Individuals to Corporate entities',
      },
      {
        id: 2,
        title: 'Entity Setup & Registration',
        description: 'Assistance in entity set up, registrations with the tax authorities, etc.',
      },
      {
        id: 3,
        title: 'Income Tax Returns',
        description: 'Preparation of Income Tax Returns / TDS Returns',
      },
      {
        id: 4,
        title: 'Tax Audit',
        description: 'Tax Audit as per Income Tax Act',
      },
      {
        id: 5,
        title: 'Corporate Tax Incentives',
        description: 'Optimum use of corporate tax incentives in proposed business activities',
      },
      {
        id: 6,
        title: 'Transfer Pricing',
        description: 'Providing consultancy in areas relating to Transfer Pricing and Double Tax Avoidance Agreements',
      },
      {
        id: 7,
        title: 'M&A Tax Advisory',
        description: 'Providing consultancy related to business Restructuring, Tax aspects of Mergers and Acquisitions, Joint Ventures etc.',
      },
      {
        id: 8,
        title: 'Tax Defense',
        description: 'Defending your stands before taxmen',
      },
      {
        id: 9,
        title: 'Tax Authority Challenges',
        description: 'Defending a tax authority challenge',
      },
      {
        id: 10,
        title: 'NRI Taxation',
        description: 'Providing consultancy to Non-Resident Clients',
      },
      {
        id: 11,
        title: 'Tax Certifications',
        description: 'Tax Certification Form 15CB etc.',
      },
      {
        id: 12,
        title: 'Impact Analysis',
        description: 'Impact analysis of recent developments like GAAR, PoEM, ICDS, Ind-AS etc.',
      },
      {
        id: 13,
        title: 'International Taxation',
        description: 'Comprehensive international tax planning and compliance services for cross-border transactions, transfer pricing, and tax treaty benefits',
      },
    ],
  },
  indirectTaxes: {
    title: 'Indirect Taxes',
    description: 'Indirect taxes pervade every area of a company\'s business. Their impact on material and product costs, cash flow, profitability and, ultimately on shareholder value is an important element to stay ahead in competition.',
    services: [
      {
        id: 1,
        title: 'GST Advisory & Compliance',
        description: 'Goods & Services Tax (GST) Advisory and Compliances',
      },
      {
        id: 2,
        title: 'GST Product Classification',
        description: 'Advisory support on product classification, valuation, place of supply, tax credits etc.',
      },
      {
        id: 3,
        title: 'GST Compliance Outsourcing',
        description: 'Complete outsourcing of GST compliances',
      },
      {
        id: 4,
        title: 'GST Refund Claims',
        description: 'Assistance in preparation of the application for refund claim along with requisite annexures for submission with the tax authorities',
      },
      {
        id: 5,
        title: 'GST Legal Matters',
        description: 'Legal Matters in GST/VAT: Advance Ruling, Appeals',
      },
      {
        id: 6,
        title: 'SEZ/EOU Services',
        description: 'Assistance in set up/ demerger/ exit of units in SEZ, EOU etc.',
      },
      {
        id: 7,
        title: 'Tax Efficient Business Models',
        description: 'Formulating indirect tax efficient business models',
      },
      {
        id: 8,
        title: 'GST Returns',
        description: 'Submission & Validation of Monthly GST Returns',
      },
      {
        id: 9,
        title: 'Annual GST Audit',
        description: 'Annual GST Audit & Return',
      },
      {
        id: 10,
        title: 'GST Reconciliation',
        description: 'Reconciliation of input credit & output liability as per Returns with Books of accounts',
      },
      {
        id: 11,
        title: 'Advance Ruling',
        description: 'Identifying cases for obtaining advance ruling, filing of application and appearance before the authority',
      },
      {
        id: 12,
        title: 'GST Credit Reconciliation',
        description: 'Reconciliation of GST credits claimed',
      },
      {
        id: 13,
        title: 'Import-Export Procedures',
        description: 'Assistance on import-export procedures',
      },
    ],
  },
  financialPlanning: {
    title: 'Financial Planning & Analysis',
    description: 'We assist clients in a wide range of strategic issues including growth and capability, market entry, diversification, target operating model, leading to business transformation. Our approach is collaborative, but analytically rigorous and backed by a strong financial plan.',
    services: [
      {
        id: 1,
        title: 'Budget Preparation',
        description: 'Preparation of Budgets',
      },
      {
        id: 2,
        title: 'Planning & Forecasting',
        description: 'Implementing best practices for planning, budgeting and forecasting',
      },
      {
        id: 3,
        title: 'Strategy Development',
        description: 'Developing Strategy, Diversification & innovation',
      },
      {
        id: 4,
        title: 'Investment Decision Support',
        description: 'Assist the client in investment decision through comparative study',
      },
      {
        id: 5,
        title: 'Value Added Analysis',
        description: 'Value added analysis method for better management decisions',
      },
      {
        id: 6,
        title: 'Management Reports',
        description: 'Preparation of management reports',
      },
      {
        id: 7,
        title: 'Business Partnering',
        description: 'Support the enterprise with more timely, reliable business inputs by business partnering',
      },
      {
        id: 8,
        title: 'Virtual CFO',
        description: 'Virtual CFO services',
      },
      {
        id: 9,
        title: 'Monthly P&L',
        description: 'Monthly Profit & Loss statement preparation and analysis for better financial decision making',
      },
    ],
  },
  businessProcessOutsourcing: {
    title: 'Business Process Outsourcing',
    description: 'Businesses are consistently evolving methodology to streamline and ensure smooth sailing within the Finance & Accounting processes. But costs are on the rise and skilled professionals are harder to hire and obviously expensive to maintain, thus more and more CFOs are looking to outsource the process either in part or full.',
    services: [
      {
        id: 1,
        title: 'Accounts Payable Services',
        description: 'Accounts Payable Services',
      },
      {
        id: 2,
        title: 'Account Receivable Services',
        description: 'Account Receivable Services',
      },
      {
        id: 3,
        title: 'Tax Preparation Services',
        description: 'Tax Preparation Services',
      },
      {
        id: 4,
        title: 'Accounts & Bookkeeping',
        description: 'Accounts & Bookkeeping Services',
      },
      {
        id: 5,
        title: 'Record to Report',
        description: 'Record to Report Services',
      },
      {
        id: 6,
        title: 'Payroll Processing',
        description: 'Payroll Processing Service',
      },
      {
        id: 7,
        title: 'Credit Monitoring',
        description: 'Credit monitoring & Receivable management',
      },
      {
        id: 8,
        title: 'Financial Analysis & Reporting',
        description: 'Financial Analysis & Reporting Service',
      },
      {
        id: 9,
        title: 'Manpower Outsourcing',
        description: 'Manpower Outsourcing',
      },
      {
        id: 10,
        title: 'Cloud Based Accounting',
        description: 'Cloud based accounting solution (QuickBooks/ZOHO)',
      },
      {
        id: 11,
        title: 'Housing Societies Accounting',
        description: 'Accounting service partner of Housing Societies (Apartmentadda.com)',
      },
    ],
  },
  loanProjectFinancing: {
    title: 'Loan & Project Financing',
    description: 'Starting an ambitious new project? Get project financing assistance for expansion, diversification, modernization, balancing of equipment, quality certification or anything else you might need to ensure your projects are nothing short of success.',
    services: [
      {
        id: 1,
        title: 'Project Reports',
        description: 'Preparation of Project Reports',
      },
      {
        id: 2,
        title: 'Bank Liaisoning',
        description: 'Liasoing with Banks & Financials institutions',
      },
      {
        id: 3,
        title: 'Business Feasibility Study',
        description: 'Business feasibility study and help in decision making',
      },
      {
        id: 4,
        title: 'Government Scheme Loans',
        description: 'Assisting the client in providing loans under various govt. scheme',
      },
      {
        id: 5,
        title: 'Government Subsidies',
        description: 'Assisting the client in availing various govt subsidies',
      },
      {
        id: 6,
        title: 'Home & Personal Loans',
        description: 'Assisting individuals in availing Home Loans & Personal Loans',
      },
      {
        id: 7,
        title: 'Loan Restructuring',
        description: 'Restructuring/ takeover of existing loans taken from financial institutions',
      },
    ],
  },
  otherServices: {
    title: 'Other Services',
    description: 'The only Thing we take seriously is our Work',
    services: [
      {
        id: 1,
        title: 'Company & LLP Incorporation',
        description: 'Company & LLP Incorporation in India and abroad',
      },
      {
        id: 2,
        title: 'ROC Compliances',
        description: 'ROC Compliances',
      },
      {
        id: 3,
        title: 'Trademark & Copyright',
        description: 'Trademark & Copyright Registration',
      },
      {
        id: 4,
        title: 'FEMA Advisory',
        description: 'Advising on matters related to Foreign Exchange Management Act',
      },
      {
        id: 5,
        title: 'Valuation Services',
        description: 'Valuation Services',
      },
      {
        id: 6,
        title: 'RERA Advisory',
        description: 'RERA Advisory Services',
      },
      {
        id: 7,
        title: 'Startup Advisory',
        description: 'Startup Advisory Services',
      },
      {
        id: 8,
        title: 'ROC Search Reports',
        description: 'Preparation of ROC search report of companies for banks',
      },
    ],
  },
};

// @route   GET /api/services
// @desc    Get all services
// @access  Public
router.get('/', (req, res) => {
  res.json({ success: true, data: services });
});

// @route   GET /api/services/:category
// @desc    Get services by category
// @access  Public
router.get('/:category', (req, res) => {
  const { category } = req.params;
  const categoryKey = category.replace(/-/g, '');
  
  if (services[categoryKey]) {
    res.json({ success: true, data: services[categoryKey] });
  } else {
    res.status(404).json({ success: false, message: 'Category not found' });
  }
});

module.exports = router;
