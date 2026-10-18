// Workbooks of data/samples as the real API reads them (sheets, rowCount, proposal, columns and preview), copied
// from the responses of POST /accounts/{id}/imports against the seeded database. The fake API serves them by label.
import type { Workbook } from './import-fixtures'

export const SAMPLE_WORKBOOKS = {
  'batch-clean': {
    fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx',
    sheets: [
      {
        sheetName: 'APP',
        hidden: false,
        rowCount: 340,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          statusName: 'Successful',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '252570479111759',
            Amount: '16.22',
            Currency: 'USD',
          },
          {
            ID: '638836480712583',
            Amount: '135.56',
            Currency: 'USD',
          },
          {
            ID: '145218785936105',
            Amount: '38.57',
            Currency: 'USD',
          },
          {
            ID: '615096738652484',
            Amount: '105.41',
            Currency: 'USD',
          },
          {
            ID: '225786563519397',
            Amount: '196.56',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'DEC',
        hidden: false,
        rowCount: 110,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 3,
          statusName: 'Declined',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '699717315840756',
            Amount: '218.83',
            Currency: 'USD',
          },
          {
            ID: '948292230795436',
            Amount: '136.45',
            Currency: 'USD',
          },
          {
            ID: '350743448242527',
            Amount: '248.61',
            Currency: 'USD',
          },
          {
            ID: '972904566589359',
            Amount: '57.23',
            Currency: 'USD',
          },
          {
            ID: '492383642729053',
            Amount: '166.98',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'CHB',
        hidden: false,
        rowCount: 3,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 4,
          statusName: 'Chargeback',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '535044421404059',
            Amount: '46.67',
            Currency: 'USD',
          },
          {
            ID: '371191545093702',
            Amount: '147.19',
            Currency: 'USD',
          },
          {
            ID: '',
            Amount: '',
            Currency: '',
          },
        ],
      },
      {
        sheetName: 'REF',
        hidden: false,
        rowCount: 7,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 5,
          statusName: 'Refund',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '175616400979144',
            Amount: '71.01000000000001',
            Currency: 'USD',
          },
          {
            ID: '207008321619693',
            Amount: '300.71',
            Currency: 'USD',
          },
          {
            ID: '778976051392144',
            Amount: '229.79',
            Currency: 'USD',
          },
          {
            ID: '145764747343164',
            Amount: '179.23',
            Currency: 'USD',
          },
          {
            ID: '248340032528239',
            Amount: '44.86',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'RDR',
        hidden: false,
        rowCount: 3,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 6,
          statusName: 'RDR',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '175186502472327',
            Amount: '89.78',
            Currency: 'USD',
          },
          {
            ID: '764993648144342',
            Amount: '301.77',
            Currency: 'USD',
          },
          {
            ID: '',
            Amount: '',
            Currency: '',
          },
        ],
      },
      {
        sheetName: 'RR',
        hidden: false,
        rowCount: 320,
        proposed: {
          kind: 'transactions',
          cycle: 'R',
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '605317920155402',
            Amount: '2.27',
            Currency: 'USD',
          },
          {
            ID: '192043669227872',
            Amount: '7.26',
            Currency: 'USD',
          },
          {
            ID: '649053369065977',
            Amount: '7.11',
            Currency: 'USD',
          },
          {
            ID: '869721161158482',
            Amount: '7.23',
            Currency: 'USD',
          },
          {
            ID: '243359248749320',
            Amount: '54.89',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'Duplicate Corrections',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Duplicate Corrections" is ignored by rule "Duplicate Corrections"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Status',
            targetField: 'status',
            source: 'global',
            statusValues: [],
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'CHB Alerts',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "CHB Alerts" is ignored by rule "CHB Alerts"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Other Fees',
        hidden: false,
        rowCount: 2,
        proposed: {
          kind: 'batch_fees',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            'Type of Fee': 'Wire Fee',
            Amount: '25',
            Currency: 'USD',
          },
          {
            'Type of Fee': 'Settlement Fee',
            Amount: '15',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'Settings',
        hidden: true,
        rowCount: 21,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Settings" is ignored by rule "Settings"',
        },
        columns: [
          {
            sourceColumn: 'Chargeback Alert Fee Types',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Column B',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Non-Transactional Fees',
            targetField: null,
            source: 'none',
          },
        ],
        preview: [
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee',
            'Column B': '',
            'Non-Transactional Fees': 'Annual Fee',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee Ethoca',
            'Column B': '',
            'Non-Transactional Fees': 'Bram Fine',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee RDR',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Assessment Fee',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Order Deduction',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback over 1%',
          },
        ],
      },
    ],
  },
  'batch-split_part1': {
    fileName: 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx',
    sheets: [
      {
        sheetName: 'APP',
        hidden: false,
        rowCount: 340,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          statusName: 'Successful',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '252570479111759',
            Amount: '16.22',
            Currency: 'USD',
          },
          {
            ID: '638836480712583',
            Amount: '135.56',
            Currency: 'USD',
          },
          {
            ID: '145218785936105',
            Amount: '38.57',
            Currency: 'USD',
          },
          {
            ID: '615096738652484',
            Amount: '105.41',
            Currency: 'USD',
          },
          {
            ID: '225786563519397',
            Amount: '196.56',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'DEC',
        hidden: false,
        rowCount: 110,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 3,
          statusName: 'Declined',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '699717315840756',
            Amount: '218.83',
            Currency: 'USD',
          },
          {
            ID: '948292230795436',
            Amount: '136.45',
            Currency: 'USD',
          },
          {
            ID: '350743448242527',
            Amount: '248.61',
            Currency: 'USD',
          },
          {
            ID: '972904566589359',
            Amount: '57.23',
            Currency: 'USD',
          },
          {
            ID: '492383642729053',
            Amount: '166.98',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'CHB',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 4,
          statusName: 'Chargeback',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'REF',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 5,
          statusName: 'Refund',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'RDR',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 6,
          statusName: 'RDR',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'RR',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'R',
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Duplicate Corrections',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Duplicate Corrections" is ignored by rule "Duplicate Corrections"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Status',
            targetField: 'status',
            source: 'global',
            statusValues: [],
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'CHB Alerts',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "CHB Alerts" is ignored by rule "CHB Alerts"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Other Fees',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'batch_fees',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Settings',
        hidden: true,
        rowCount: 21,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Settings" is ignored by rule "Settings"',
        },
        columns: [
          {
            sourceColumn: 'Chargeback Alert Fee Types',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Column B',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Non-Transactional Fees',
            targetField: null,
            source: 'none',
          },
        ],
        preview: [
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee',
            'Column B': '',
            'Non-Transactional Fees': 'Annual Fee',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee Ethoca',
            'Column B': '',
            'Non-Transactional Fees': 'Bram Fine',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee RDR',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Assessment Fee',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Order Deduction',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback over 1%',
          },
        ],
      },
    ],
  },
  'batch-split_part2': {
    fileName: 'Recon_Template_ProviderA-USD_batch-split_part2.xlsx',
    sheets: [
      {
        sheetName: 'APP',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          statusName: 'Successful',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'DEC',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 3,
          statusName: 'Declined',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'CHB',
        hidden: false,
        rowCount: 3,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 4,
          statusName: 'Chargeback',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '535044421404059',
            Amount: '46.67',
            Currency: 'USD',
          },
          {
            ID: '371191545093702',
            Amount: '147.19',
            Currency: 'USD',
          },
          {
            ID: '',
            Amount: '',
            Currency: '',
          },
        ],
      },
      {
        sheetName: 'REF',
        hidden: false,
        rowCount: 7,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 5,
          statusName: 'Refund',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '175616400979144',
            Amount: '71.01000000000001',
            Currency: 'USD',
          },
          {
            ID: '207008321619693',
            Amount: '300.71',
            Currency: 'USD',
          },
          {
            ID: '778976051392144',
            Amount: '229.79',
            Currency: 'USD',
          },
          {
            ID: '145764747343164',
            Amount: '179.23',
            Currency: 'USD',
          },
          {
            ID: '248340032528239',
            Amount: '44.86',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'RDR',
        hidden: false,
        rowCount: 3,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 6,
          statusName: 'RDR',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '175186502472327',
            Amount: '89.78',
            Currency: 'USD',
          },
          {
            ID: '764993648144342',
            Amount: '301.77',
            Currency: 'USD',
          },
          {
            ID: '',
            Amount: '',
            Currency: '',
          },
        ],
      },
      {
        sheetName: 'RR',
        hidden: false,
        rowCount: 320,
        proposed: {
          kind: 'transactions',
          cycle: 'R',
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '605317920155402',
            Amount: '2.27',
            Currency: 'USD',
          },
          {
            ID: '192043669227872',
            Amount: '7.26',
            Currency: 'USD',
          },
          {
            ID: '649053369065977',
            Amount: '7.11',
            Currency: 'USD',
          },
          {
            ID: '869721161158482',
            Amount: '7.23',
            Currency: 'USD',
          },
          {
            ID: '243359248749320',
            Amount: '54.89',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'Duplicate Corrections',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Duplicate Corrections" is ignored by rule "Duplicate Corrections"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Status',
            targetField: 'status',
            source: 'global',
            statusValues: [],
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'CHB Alerts',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "CHB Alerts" is ignored by rule "CHB Alerts"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Other Fees',
        hidden: false,
        rowCount: 2,
        proposed: {
          kind: 'batch_fees',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            'Type of Fee': 'Wire Fee',
            Amount: '25',
            Currency: 'USD',
          },
          {
            'Type of Fee': 'Settlement Fee',
            Amount: '15',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'Settings',
        hidden: true,
        rowCount: 21,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Settings" is ignored by rule "Settings"',
        },
        columns: [
          {
            sourceColumn: 'Chargeback Alert Fee Types',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Column B',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Non-Transactional Fees',
            targetField: null,
            source: 'none',
          },
        ],
        preview: [
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee',
            'Column B': '',
            'Non-Transactional Fees': 'Annual Fee',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee Ethoca',
            'Column B': '',
            'Non-Transactional Fees': 'Bram Fine',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee RDR',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Assessment Fee',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Order Deduction',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback over 1%',
          },
        ],
      },
    ],
  },
  'batch-issues': {
    fileName: 'Recon_Template_ProviderB-Main_batch-issues.xlsx',
    sheets: [
      {
        sheetName: 'APP',
        hidden: false,
        rowCount: 339,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          statusName: 'Successful',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '387071875960120',
            Amount: '263.91',
            Currency: 'USD',
          },
          {
            ID: '822487481952465',
            Amount: '173.38',
            Currency: 'USD',
          },
          {
            ID: '493729817445418',
            Amount: '115.08',
            Currency: 'USD',
          },
          {
            ID: '841852132034817',
            Amount: '74.45',
            Currency: 'USD',
          },
          {
            ID: '600049826007136',
            Amount: '198.07',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'DEC',
        hidden: false,
        rowCount: 101,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 3,
          statusName: 'Declined',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '286245806396709',
            Amount: '135.95',
            Currency: 'USD',
          },
          {
            ID: '157316817395616',
            Amount: '163.93',
            Currency: 'USD',
          },
          {
            ID: '812668609189049',
            Amount: '211.04',
            Currency: 'USD',
          },
          {
            ID: '382799468298121',
            Amount: '144.05',
            Currency: 'USD',
          },
          {
            ID: '823027495844528',
            Amount: '133.59',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'CHB',
        hidden: false,
        rowCount: 8,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 4,
          statusName: 'Chargeback',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '454343276094666',
            Amount: '340.66',
            Currency: 'USD',
          },
          {
            ID: '105071174110265',
            Amount: '39.57',
            Currency: 'USD',
          },
          {
            ID: '929960819826592',
            Amount: '182.03',
            Currency: 'USD',
          },
          {
            ID: '228815181373784',
            Amount: '203.71',
            Currency: 'USD',
          },
          {
            ID: '789446496106597',
            Amount: '37.15',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'REF',
        hidden: false,
        rowCount: 4,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 5,
          statusName: 'Refund',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '762555978985823',
            Amount: '-430.62',
            Currency: 'USD',
          },
          {
            ID: '655757186252493',
            Amount: '54.81',
            Currency: 'USD',
          },
          {
            ID: '827891935072250',
            Amount: '192.43',
            Currency: 'USD',
          },
          {
            ID: '',
            Amount: '',
            Currency: '',
          },
        ],
      },
      {
        sheetName: 'RDR',
        hidden: false,
        rowCount: 1,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 6,
          statusName: 'RDR',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '',
            Amount: '',
            Currency: '',
          },
        ],
      },
      {
        sheetName: 'RR',
        hidden: false,
        rowCount: 317,
        proposed: {
          kind: 'transactions',
          cycle: 'R',
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '475485632651495',
            Amount: '2.34',
            Currency: 'USD',
          },
          {
            ID: '961179701152651',
            Amount: '3.1',
            Currency: 'USD',
          },
          {
            ID: '938273436934189',
            Amount: '18.19',
            Currency: 'USD',
          },
          {
            ID: '364272061243147',
            Amount: '15.97',
            Currency: 'USD',
          },
          {
            ID: '193573780830197',
            Amount: '23.3',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'Duplicate Corrections',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Duplicate Corrections" is ignored by rule "Duplicate Corrections"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Status',
            targetField: 'status',
            source: 'global',
            statusValues: [],
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'CHB Alerts',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "CHB Alerts" is ignored by rule "CHB Alerts"',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Other Fees',
        hidden: false,
        rowCount: 2,
        proposed: {
          kind: 'batch_fees',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            'Type of Fee': 'Wire Fee',
            Amount: '25',
            Currency: 'USD',
          },
          {
            'Type of Fee': 'Fraud Monitoring Fee',
            Amount: '99',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'Settings',
        hidden: true,
        rowCount: 21,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Settings" is ignored by rule "Settings"',
        },
        columns: [
          {
            sourceColumn: 'Chargeback Alert Fee Types',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Column B',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Non-Transactional Fees',
            targetField: null,
            source: 'none',
          },
        ],
        preview: [
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee',
            'Column B': '',
            'Non-Transactional Fees': 'Annual Fee',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee Ethoca',
            'Column B': '',
            'Non-Transactional Fees': 'Bram Fine',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee RDR',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Assessment Fee',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Order Deduction',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback over 1%',
          },
        ],
      },
    ],
  },
  'batch-blocked': {
    fileName: 'Recon_Template_ProviderB-Main_batch-blocked.xlsx',
    sheets: [
      {
        sheetName: 'APP',
        hidden: false,
        rowCount: 21,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 2,
          statusName: 'Successful',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [
          {
            ID: '387071875960120',
            Amount: '263.91',
            Currency: 'USD',
          },
          {
            ID: '822487481952465',
            Amount: '173.38',
            Currency: 'USD',
          },
          {
            ID: '493729817445418',
            Amount: '115.08',
            Currency: 'USD',
          },
          {
            ID: '841852132034817',
            Amount: '74.45',
            Currency: 'USD',
          },
          {
            ID: '600049826007136',
            Amount: '198.07',
            Currency: 'USD',
          },
        ],
      },
      {
        sheetName: 'DEC',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 3,
          statusName: 'Declined',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'CHB',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 4,
          statusName: 'Chargeback',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'REF',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 5,
          statusName: 'Refund',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'RDR',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: 6,
          statusName: 'RDR',
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'RR',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'transactions',
          cycle: 'R',
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'ID',
            targetField: 'transactionId',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Other Fees',
        hidden: false,
        rowCount: 0,
        proposed: {
          kind: 'batch_fees',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
        },
        columns: [
          {
            sourceColumn: 'Type of Fee',
            targetField: 'feeType',
            source: 'global',
          },
          {
            sourceColumn: 'Amount',
            targetField: 'amount',
            source: 'global',
          },
          {
            sourceColumn: 'Currency',
            targetField: 'currency',
            source: 'global',
          },
        ],
        preview: [],
      },
      {
        sheetName: 'Settings',
        hidden: true,
        rowCount: 21,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'global',
          note: 'Sheet "Settings" is ignored by rule "Settings"',
        },
        columns: [
          {
            sourceColumn: 'Chargeback Alert Fee Types',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Column B',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Non-Transactional Fees',
            targetField: null,
            source: 'none',
          },
        ],
        preview: [
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee',
            'Column B': '',
            'Non-Transactional Fees': 'Annual Fee',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee Ethoca',
            'Column B': '',
            'Non-Transactional Fees': 'Bram Fine',
          },
          {
            'Chargeback Alert Fee Types': 'Chargeback Alert Fee RDR',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Assessment Fee',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback Order Deduction',
          },
          {
            'Chargeback Alert Fee Types': '',
            'Column B': '',
            'Non-Transactional Fees': 'Chargeback over 1%',
          },
        ],
      },
    ],
  },
  'legacy-provider': {
    fileName: 'Legacy_ProviderC-Alt_batch.xlsx',
    sheets: [
      {
        sheetName: 'Summary',
        hidden: false,
        rowCount: 1,
        proposed: {
          kind: 'ignore',
          cycle: null,
          statusId: null,
          statusName: null,
          source: 'account',
          note: 'Sheet "Summary" is ignored by rule "Summary"',
        },
        columns: [
          {
            sourceColumn: 'Batch',
            targetField: null,
            source: 'none',
          },
          {
            sourceColumn: 'Total',
            targetField: null,
            source: 'none',
          },
        ],
        preview: [
          {
            Batch: 'Batch 7',
            Total: '7431.52',
          },
        ],
      },
      {
        sheetName: 'TRX',
        hidden: false,
        rowCount: 60,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: null,
          statusName: null,
          source: 'account',
        },
        columns: [
          {
            sourceColumn: 'Merchant Order No#',
            targetField: 'transactionId',
            source: 'account',
          },
          {
            sourceColumn: 'Order Status',
            targetField: 'status',
            source: 'account',
            statusValues: [
              {
                value: 'Successful',
                statusId: 2,
                statusName: 'Successful',
                excludeAmount: false,
              },
            ],
          },
          {
            sourceColumn: 'Amount USD',
            targetField: 'amount',
            source: 'account',
          },
        ],
        preview: [
          {
            'Merchant Order No#': 'de0d5456-d2d1-4de5-9ce9-baeae3370c11',
            'Order Status': 'Successful',
            'Amount USD': '174.29',
          },
          {
            'Merchant Order No#': 'fc2e36db-27d4-4139-989a-2340609140da',
            'Order Status': 'Successful',
            'Amount USD': '206.82',
          },
          {
            'Merchant Order No#': 'c39769e1-df38-4397-b123-dd477d2efc32',
            'Order Status': 'Successful',
            'Amount USD': '60.44',
          },
          {
            'Merchant Order No#': '8fa2a3be-a381-4298-824d-9f0588458245',
            'Order Status': 'Successful',
            'Amount USD': '167.7',
          },
          {
            'Merchant Order No#': '2535392f-4f9d-491f-be2c-4fd817fbb68b',
            'Order Status': 'Successful',
            'Amount USD': '59.46',
          },
        ],
      },
      {
        sheetName: 'Fail',
        hidden: false,
        rowCount: 20,
        proposed: {
          kind: 'transactions',
          cycle: 'E',
          statusId: 3,
          statusName: 'Declined',
          source: 'account',
        },
        columns: [
          {
            sourceColumn: 'Merchant Order No#',
            targetField: 'transactionId',
            source: 'account',
          },
          {
            sourceColumn: 'Order Status',
            targetField: 'status',
            source: 'account',
            statusValues: [
              {
                value: 'Failed',
                statusId: 3,
                statusName: 'Declined',
                excludeAmount: false,
              },
            ],
          },
          {
            sourceColumn: 'Amount USD',
            targetField: 'amount',
            source: 'account',
          },
        ],
        preview: [
          {
            'Merchant Order No#': 'c0871a18-65df-4d1b-abef-fcdb1c44edf0',
            'Order Status': 'Failed',
            'Amount USD': '134.85',
          },
          {
            'Merchant Order No#': 'a2255bc4-1015-4d18-8dbd-79bbcc3e6f41',
            'Order Status': 'Failed',
            'Amount USD': '266.53',
          },
          {
            'Merchant Order No#': 'e395a28a-0d23-4535-8aef-eb9cca7e70e6',
            'Order Status': 'Failed',
            'Amount USD': '86.20999999999999',
          },
          {
            'Merchant Order No#': 'c76543a6-f7a5-4ce9-9ade-09a338004ae2',
            'Order Status': 'Failed',
            'Amount USD': '59.82',
          },
          {
            'Merchant Order No#': 'e86d13f9-e94d-44ec-b8ad-0681ed85e747',
            'Order Status': 'Failed',
            'Amount USD': '66.84',
          },
        ],
      },
      {
        sheetName: 'CB',
        hidden: false,
        rowCount: 1,
        proposed: {
          kind: 'transactions',
          cycle: 'I',
          statusId: null,
          statusName: null,
          source: 'account',
        },
        columns: [
          {
            sourceColumn: 'Merchant Order No#',
            targetField: 'transactionId',
            source: 'account',
          },
          {
            sourceColumn: 'Order Status',
            targetField: 'status',
            source: 'account',
            statusValues: [
              {
                value: 'CHB 2',
                statusId: 4,
                statusName: 'Chargeback',
                excludeAmount: true,
              },
            ],
          },
          {
            sourceColumn: 'Amount USD',
            targetField: 'amount',
            source: 'account',
          },
        ],
        preview: [
          {
            'Merchant Order No#': 'df14616d-4b26-4ffb-9984-72717ebff6a6',
            'Order Status': 'CHB 2',
            'Amount USD': '305.32',
          },
        ],
      },
    ],
  },
} satisfies Record<string, Workbook>
