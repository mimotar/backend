// config/premblyMap.js
export const premblyMap = {
  NG: {
    name: "Nigeria",
    channels: { 
      nin: { endpoint: "verification/vnin-basic", requiredFields: ["number"] },
      bvn: { endpoint: "verification/bvn_validation", requiredFields: ["number"] },
      driver_license: { endpoint: "verification/drivers_license/advance/v2", requiredFields: ["number", "first_name", "last_name"] },
      international_passport: { endpoint: "verification/national_passport", requiredFields: ["number", "nin", "dob"] },
    }
  },
  KE: {
    name: "Kenya",
    channels: {
      national_id: { endpoint: "/identitypass/verification/ke/national_id", requiredFields: ["number"] },
      passport: { endpoint: "/identitypass/verification/ke/passport", requiredFields: ["number", "last_name"] }
    }
  },
  GH: {
    name: "Ghana",
    channels: {
      voters_card: { endpoint: "/identitypass/verification/gh/voter", requiredFields: ["number", "type"] }
    }
  }
};