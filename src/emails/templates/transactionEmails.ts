function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getTransactionPendingClosureInitiatorEmail(name: string, transactionId: string) {
  return {
    subject: "Transaction Closure Requested",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>You have successfully requested to close transaction ${transactionId}.</p>
      <p>The client has 48 hours to accept the delivery or send it back for revision.</p>
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
      <p>Please log in to accept the delivery or send it back for revision within 48 hours. Opening a dispute is a separate action.</p>
      <p>If no action is taken within 48 hours, the transaction will automatically be completed.</p>
    `,
  };
}

export function getTransactionCompletedEmail(name: string, transactionId: string, autoCompleted: boolean = false) {
  return {
    subject: "Transaction Completed",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>Transaction ${transactionId} has been successfully completed${autoCompleted ? " automatically as the 48-hour review period expired" : ""}.</p>
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

export function getTransactionDeliveryRejectedFreelancerEmail(
  name: string,
  transactionId: string,
  reason: string
) {
  return {
    subject: "Delivery sent back for revision",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>The client requested changes on transaction ${transactionId} and did not release escrow.</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p>Please update the work and submit delivery again.</p>
    `,
  };
}

export function getTransactionDeliveryRejectedBuyerEmail(
  name: string,
  transactionId: string,
  reason: string
) {
  return {
    subject: "Revision requested",
    htmlContent: `
      <h2>Hello ${name},</h2>
      <p>You sent transaction ${transactionId} back to the freelancer for revision.</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p>Escrow is still held. This is not a dispute. The freelancer can submit delivery again.</p>
    `,
  };
}
