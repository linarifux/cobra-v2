import TestCarrier from '../models/testCarrierModel.js';
import { connectUpsCarrier } from '../services/shipStationService.js';

// @desc    Create a new UPS carrier connection in ShipStation & local DB
// @route   POST /api/v1/test-carriers
export const createCarrierConnection = async (req, res) => {
  try {
    const { 
      nickname, 
      account_number, 
      account_postal_code, 
      account_country_code 
    } = req.body;

    console.log(req.body);

    // 1. Transmit payload to ShipStation API via the dedicated service function
    const shipstationData = await connectUpsCarrier({
      nickname,
      account_number,
      account_postal_code,
      account_country_code
    });

    // 2. Save the mapped record to the local database
    const newCarrier = await TestCarrier.create({
      nickname,
      accountNumber: account_number,
      postalCode: account_postal_code,
      countryCode: account_country_code,
      // Assuming ShipStation returns an identifier in the response
      shipstationProviderId: shipstationData.providerId || null 
    });

    // 3. Send successful response back to the client
    res.status(201).json({
      status: 'success',
      data: {
        localRecord: newCarrier,
        shipstationData: shipstationData
      }
    });

  } catch (error) {
    // The handleApiError in your service already extracts the proper message
    console.error('ShipStation Integration Error:', error.message);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create carrier connection'
    });
  }
};
