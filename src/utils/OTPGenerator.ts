export function generateSixDigitString(): string {
    let result = "";
  
    for (let i = 0; i < 6; i++) {
      const digit = Math.floor(Math.random() * 10);
      result += digit.toString();
    }
  
    return result;
  }
  