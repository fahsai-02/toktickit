const TICKET_NUMBER_RE = /^TKT-(\d{4})-(\d{6})$/;

export function formatTicketNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 0) {
    throw new Error(`Invalid ticket-number year: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error(`Invalid ticket-number sequence: ${sequence}`);
  }
  return `TKT-${String(year).padStart(4, "0")}-${String(sequence).padStart(6, "0")}`;
}

export function extractTicketNumberSequence(
  ticketNumber: string,
  year: number
): number | null {
  const match = TICKET_NUMBER_RE.exec(ticketNumber);
  if (!match) return null;
  const matchYear = Number(match[1]);
  if (matchYear !== year) return null;
  return Number(match[2]);
}

export function buildNextTicketNumber(
  existingNumbers: string[],
  year: number
): string {
  let max = 0;
  for (const ticketNumber of existingNumbers) {
    const sequence = extractTicketNumberSequence(ticketNumber, year);
    if (sequence !== null && sequence > max) {
      max = sequence;
    }
  }
  return formatTicketNumber(year, max + 1);
}
