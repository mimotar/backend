// Updated types
interface EscrowCalculation {
  originalAmount: number;
  commissionRate: number;
  totalCommission: number;
  buyerCommissionShare: number;
  sellerCommissionShare: number;
  buyerTotalPayment: number;
  sellerTotalPayment: number;
  breakdown: {
    originalAmount: number;
    totalEscrowFee: number;
    buyerPaysCommission: number;
    sellerPaysCommission: number;
    buyerFinalTotal: number;
    sellerFinalTotal: number;
  };
}

enum EscrowFeePayer {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  BOTH = 'BOTH'
}

/**
 * Calculate escrow payment based on who pays the fee
 * @param amount - Original transaction amount
 * @param payerType - Who pays the escrow fee (BUYER, SELLER, or BOTH)
 * @returns EscrowCalculation with detailed breakdown
 */
function calculateEscrowPayment(
  amount: number, 
  payerType: EscrowFeePayer = EscrowFeePayer.BUYER
): EscrowCalculation {
  
  // Input validation
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Determine commission rate based on amount tiers
  let commissionRate: number;
  let flatFee: number = 0;

  if (amount <= 100000) {
    // ₦1 - ₦100,000: 3.0%
    commissionRate = 0.03;
  } else if (amount <= 1000000) {
    // ₦100,001 - ₦1,000,000: 2.5%
    commissionRate = 0.025;
  } else if (amount <= 5000000) {
    // ₦1,000,001 - ₦5,000,000: 2.2%
    commissionRate = 0.022;
  } else {
    // ₦5,000,001+: 2.0% + ₦5,000 flat fee
    commissionRate = 0.02;
    flatFee = 5000;
  }

  // Calculate total commission
  const percentageCommission = amount * commissionRate;
  const totalCommission = percentageCommission + flatFee;

  // Calculate commission share based on payer type
  let buyerCommissionShare: number;
  let sellerCommissionShare: number;

  switch (payerType) {
    case EscrowFeePayer.BUYER:
      buyerCommissionShare = totalCommission;
      sellerCommissionShare = 0;
      break;
    case EscrowFeePayer.SELLER:
      buyerCommissionShare = 0;
      sellerCommissionShare = totalCommission;
      break;
    case EscrowFeePayer.BOTH:
      buyerCommissionShare = totalCommission / 2;
      sellerCommissionShare = totalCommission / 2;
      break;
    default:
      throw new Error('Invalid payer type');
  }

  // Calculate total amounts each party pays
  const buyerTotalPayment = amount + buyerCommissionShare;
  const sellerTotalPayment = sellerCommissionShare; // Seller only pays their commission share

  return {
    originalAmount: amount,
    commissionRate: commissionRate,
    totalCommission: totalCommission,
    buyerCommissionShare: buyerCommissionShare,
    sellerCommissionShare: sellerCommissionShare,
    buyerTotalPayment: buyerTotalPayment,
    sellerTotalPayment: sellerTotalPayment,
    breakdown: {
      originalAmount: amount,
      totalEscrowFee: totalCommission,
      buyerPaysCommission: buyerCommissionShare,
      sellerPaysCommission: sellerCommissionShare,
      buyerFinalTotal: buyerTotalPayment,
      sellerFinalTotal: sellerTotalPayment
    }
  };
}

/**
 * Get the amount a specific party needs to pay
 * @param amount - Original transaction amount
 * @param payerType - Who pays the escrow fee
 * @param requestingParty - Which party's payment amount to return
 * @returns The amount the requesting party needs to pay
 */
function getAmountToPay(
  amount: number,
  payerType: EscrowFeePayer,
  requestingParty: 'BUYER' | 'SELLER'
): number {
  const calculation = calculateEscrowPayment(amount, payerType);
  
  return requestingParty === 'BUYER' 
    ? calculation.buyerTotalPayment 
    : calculation.sellerTotalPayment;
}

// // Example usage and testing:
// console.log('=== Testing with ₦150,000 ===');

// // Test 1: Buyer pays all
// const test1 = calculateEscrowPayment(150000, EscrowFeePayer.BUYER);
// console.log('Buyer pays all:', test1);

// // Test 2: Seller pays all  
// const test2 = calculateEscrowPayment(150000, EscrowFeePayer.SELLER);
// console.log('Seller pays all:', test2);

// // Test 3: Both split 50/50
// const test3 = calculateEscrowPayment(150000, EscrowFeePayer.BOTH);
// console.log('Both split 50/50:', test3);

export { 
  calculateEscrowPayment, 
  getAmountToPay, 
  EscrowFeePayer,
  type EscrowCalculation 
};