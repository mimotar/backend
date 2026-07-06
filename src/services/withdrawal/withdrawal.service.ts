import { premblyAxiosInstance } from '../../config/premblyConfig.js';
import prisma from '../../utils/prisma.js';
import { premblyMap } from './data/premblyMap.js';
import axios from "axios";

type CountryCode = keyof typeof premblyMap;
type PremblyChannelConfig = {
  endpoint: string;
  requiredFields: readonly string[];
};
type IdentityPayload = Record<string, unknown>;
type NormalizedVerificationResponse = {
  sureName: string;
  firstName: string;
  middleName: string;
  lastName: string;
};
type PremblyErrorDetail = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

export class PremblyVerificationError extends Error {
  statusCode: number;
  details: PremblyErrorDetail;

  constructor(message: string, details: PremblyErrorDetail = {}) {
    super(message);
    this.name = 'PremblyVerificationError';
    this.statusCode = details.status && details.status < 500 ? 400 : 502;
    this.details = details;
  }
}

export class WithdrawalService {
  private userId: number;

  constructor(userId: number) {
    this.userId = userId;
  }
  updateUserNames = async (
    firstName?: string,
    middleName?: string,
    lastName?: string,
    sureName?: string,
  ) => {
    try {
      const data: {
        firstName?: string;
        middleName?: string;
        lastName?: string;
        sureName?: string;
      } = {};

      if (firstName) data.firstName = firstName;
      if (middleName) data.middleName = middleName;
      if (lastName) data.lastName = lastName;
      if (sureName) data.sureName = sureName;

      if (!Object.keys(data).length) {
        return prisma.user.findUnique({ where: { id: this.userId } });
      }

      const updatedUser = await prisma.user.update({
        where: { id: this.userId },
        data,
      });
      return updatedUser;
    } catch (error) {
      throw new Error('Failed to update user names');
    }
  };

  private isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };

  private flattenResponse = (
    value: unknown,
    flattened: Record<string, string> = {},
    currentPath = '',
  ) => {
    if (!this.isRecord(value)) return flattened;

    for (const [key, rawValue] of Object.entries(value)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const newPath = currentPath ? `${currentPath}.${cleanKey}` : cleanKey;

      if (this.isRecord(rawValue)) {
        this.flattenResponse(rawValue, flattened, newPath);
        continue;
      }

      if (Array.isArray(rawValue)) continue;
      if (rawValue === undefined || rawValue === null) continue;

      const normalizedValue = String(rawValue).trim();
      flattened[cleanKey] = normalizedValue;
      flattened[newPath] = normalizedValue;
    }

    return flattened;
  };

  private readFirst = (data: Record<string, string>, keys: string[]) => {
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const value =
        data[normalizedKey] ??
        Object.entries(data).find(([dataKey]) =>
          dataKey.endsWith(`.${normalizedKey}`),
        )?.[1];
      if (value) return value;
    }

    return '';
  };

  private isSuccessfulVerification = (response: unknown) => {
    const data = this.flattenResponse(response);
    const successValue = this.readFirst(data, [
      'status',
      'verification_status',
      'verificationStatus',
      'identity_status',
      'identityStatus',
      'verified',
      'is_verified',
      'isVerified',
      'success',
    ]).toLowerCase();

    if (!successValue) return true;

    return [
      'true',
      'success',
      'successful',
      'verified',
      'completed',
      'passed',
    ].includes(successValue);
  };

  normalizeVerificationResponse = (
    response: unknown,
  ): NormalizedVerificationResponse => {
    const resData = this.flattenResponse(response);
    const sureName = this.readFirst(resData, [
      'sureName',
      'surname',
      'surName',
      'sure_name',
      'last_name',
      'lastName',
      'family_name',
      'familyName',
      'currentSureName',
      'currentSurname',
      'currentLastName',
      'currentFamilyName',
    ]);
    const firstName = this.readFirst(resData, [
      'firstName',
      'first_name',
      'given_name',
      'givenName',
      'firstname',
      'currentFirstName',
      'currentFirst_name',
      'currentGiven_name',
      'currentGivenName',
    ]);
    const middleName = this.readFirst(resData, [
      'middleName',
      'middle_name',
      'middlename',
      'currentMiddleName',
      'currentMiddle_name',
    ]);

    return {
      sureName,
      firstName,
      middleName,
      lastName:
        this.readFirst(resData, [
          'lastName',
          'last_name',
          'surname',
          'surName',
          'sureName',
          'familyName',
          'family_name',
        ]) || sureName,
    };
  };

  private getChannelConfig = (
    country: CountryCode,
    channel: string,
  ): PremblyChannelConfig => {
    const countryConfig = premblyMap[country];
    if (!countryConfig) {
      throw new Error(`Unsupported country: ${country}`);
    }

    const channels = countryConfig.channels as Record<
      string,
      PremblyChannelConfig
    >;
    const channelConfig = channels[channel];
    if (!channelConfig) {
      throw new Error(
        `Unsupported verification channel for ${countryConfig.name}: ${channel}`,
      );
    }

    return channelConfig;
  };

  getSupportedIdentityChannels = () => {
    return Object.entries(premblyMap).map(([code, countryConfig]) => ({
      code,
      name: countryConfig.name,
      channels: Object.entries(
        countryConfig.channels as Record<string, PremblyChannelConfig>,
      ).map(([key, channel]) => ({
        key,
        endpoint: channel.endpoint,
        requiredFields: channel.requiredFields,
      })),
    }));
  };

  getKycStatus = async () => {
    return prisma.userKYC.findUnique({
      where: { userId: this.userId },
    });
  };

  private buildPremblyPayload = (
    requiredFields: readonly string[],
    data: IdentityPayload,
  ) => {
    const payload: IdentityPayload = {};
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
        continue;
      }

      if (typeof value !== 'string') {
        throw new Error(
          `data.${field} must be a string. Identity numbers can contain leading zeros or letters, so send them as strings.`,
        );
      }

      payload[field] = value;
    }

    if (missingFields.length) {
      throw new Error(
        `Missing required identity field(s): ${missingFields.join(', ')}`,
      );
    }

    return payload;
  };

  verifyIdentity = async (
    country: CountryCode,
    channel: string,
    data: IdentityPayload,
  ) => {
    const channelConfig = this.getChannelConfig(country, channel);
    const payload = this.buildPremblyPayload(
      channelConfig.requiredFields,
      data,
    );
    let response;

    try {
      response = await premblyAxiosInstance.post(
        channelConfig.endpoint,
        payload,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const providerMessage = this.readProviderErrorMessage(error.response?.data);
        throw new PremblyVerificationError(
          providerMessage || error.message,
          {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
          },
        );
      }

      throw error;
    }

    const normalizedData = this.normalizeVerificationResponse(response.data);
    const isVerified = this.isSuccessfulVerification(response.data);

    const kyc = await prisma.userKYC.upsert({
      where: { userId: this.userId },
      create: {
        userId: this.userId,
        isVerified,
        kycDocumentType: channel,
        kycDocumentNumber: String(payload.number ?? ''),
      },
      update: {
        isVerified,
        kycDocumentType: channel,
        kycDocumentNumber: String(payload.number ?? ''),
      },
    });

    if (isVerified) {
      await this.updateUserNames(
        normalizedData.firstName,
        normalizedData.middleName,
        normalizedData.lastName,
        normalizedData.sureName,
      );
    }

    return {
      isVerified,
      kyc,
      identity: normalizedData,
      providerResponse: response.data,
    };
  };

  private readProviderErrorMessage = (data: unknown) => {
    if (!data) return '';

    if (typeof data === 'string') return data;

    if (this.isRecord(data)) {
      const flattened = this.flattenResponse(data);
      return this.readFirst(flattened, [
        'message',
        'error',
        'detail',
        'description',
        'response_message',
        'responseMessage',
      ]);
    }

    return '';
  };
  addAccountDetails = async (bankCode: number, accountNumber: number) => {
    const user = await prisma.user.findUnique({
      where: { id: this.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }
    if( user.verified === false) {
      throw new Error('Complete your verification before you can add your account number');
    }
    try {
        axios.post('', {

        })
    } catch( error ) {

    }
  };


  withdrawEarnings = async () => {};
}

export default WithdrawalService;
