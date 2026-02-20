// services/contact.service.ts
import {
  type Contact,
  type Prisma,
  PrismaClient,
} from "../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";


class ContactService {
  constructor(private readonly prisma: PrismaClient) {}

  async createContact(data: Prisma.ContactCreateInput): Promise<Contact> {
    try {
      return await this.prisma.contact.create({
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create contact: ${message}`);
    }
  }

  async getAllContacts(): Promise<Contact[]> {
    try {
      return await this.prisma.contact.findMany();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch contacts: ${message}`);
    }
  }

  async getContactById(id: number): Promise<Contact | null> {
    try {
      return await this.prisma.contact.findUnique({
        where: { id },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch contact: ${message}`);
    }
  }

  async updateContact(
    id: number,
    data: Prisma.ContactUpdateInput,
  ): Promise<Contact> {
    try {
      return await this.prisma.contact.update({
        where: { id },
        data,
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new Error("Contact not found");
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to update contact: ${message}`);
    }
  }

  async deleteContact(id: number): Promise<Contact> {
    try {
      return await this.prisma.contact.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2025"
      ) {
        throw new Error("Contact not found");
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to delete contact: ${message}`);
    }
  }

  async deleteAllContacts(){
    try {
        const contacts = await this.prisma.contact.findMany();
        if( !contacts ){
            throw new Error("No contacts found");
        }
        const deletedContacts = await this.prisma.contact.deleteMany();
        if( !deletedContacts ){
            throw new Error("Failed to delete contacts");
        }
        return deletedContacts;
    } catch (error) {
        console.error("Error in deleting all contacts:", error);
        throw new Error("Failed to delete all contacts");
    }
  }
}

export default new ContactService(prisma);