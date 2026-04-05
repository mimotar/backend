export function getTransactionPendingClosureInitiatorEmail(name: string, transactionId: string) {
  return {
    subject: "Transaction Closure Requested",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>You have successfully requested to close transaction ${transactionId}.</p>
      <p>The counter-party has 24 hours to accept or reject this closure.</p>
      <p>If no action is taken, the transaction will automatically be completed.</p>
    `,
  };
}

export function getTransactionPendingClosureCounterpartyEmail(name: string, transactionId: string) {
  return {
    subject: "Action Required: Transaction Closure Requested",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>The other party has requested to close transaction ${transactionId}.</p>
      <p>Please log in to accept or reject this resolution within 24 hours.</p>
      <p>If no action is taken within 24 hours, the transaction will automatically be completed.</p>
    `,
  };
}

export function getTransactionCompletedEmail(name: string, transactionId: string, autoCompleted: boolean = false) {
  return {
    subject: "Transaction Completed",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>Transaction ${transactionId} has been successfully completed${autoCompleted ? " automatically as the 24-hour review period expired" : ""}.</p>
      <p>Thank you for using our platform.</p>
    `,
  };
}

export function getTransactionDisputedEmail(name: string, transactionId: string) {
  return {
    subject: "Transaction Disputed",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>The closure for transaction ${transactionId} has been rejected by the counter-party.</p>
      <p>The transaction has now been moved to DISPUTE status.</p>
      <p>Our team will contact you shortly.</p>
    `,
  };
}
