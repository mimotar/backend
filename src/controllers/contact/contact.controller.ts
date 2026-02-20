import type { Request, Response } from "express";
import prisma from "../../utils/prisma.js";
import contactService from "../../services/contact/contact.service.js";


export class ContactController {
  async create(req: Request, res: Response) {
    try {
      const contact = await contactService.createContact(req.body);
      return res.status(201).json({
        message: "Contact created",
        data: contact,
        success: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        message: "Failed to create contact",
        error: message,
        success: false,
      });
    }
  }

  async getAll(_req: Request, res: Response) {
    try {
      const contacts = await contactService.getAllContacts();
      return res.status(200).json({
        message: "Contacts fetched",
        data: contacts,
        success: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        message: "Failed to fetch contacts",
        error: message,
        success: false,
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid contact id",
          success: false,
        });
      }
      const contact = await contactService.getContactById(id);
      if (!contact) {
        return res.status(404).json({
          message: "Contact not found",
          success: false,
        });
      }
      return res.status(200).json({
        message: "Contact fetched",
        data: contact,
        success: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        message: "Failed to fetch contact",
        error: message,
        success: false,
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid contact id",
          success: false,
        });
      }
      const contact = await contactService.updateContact(id, req.body);
      return res.status(200).json({
        message: "Contact updated",
        data: contact,
        success: true,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Contact not found") {
        return res.status(404).json({
          message: "Contact not found",
          success: false,
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        message: "Failed to update contact",
        error: message,
        success: false,
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid contact id",
          success: false,
        });
      }
      await contactService.deleteContact(id);
      return res.status(200).json({
        message: "Contact deleted",
        success: true,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Contact not found") {
        return res.status(404).json({
          message: "Contact not found",
          success: false,
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        message: "Failed to delete contact",
        error: message,
        success: false,
      });
    }
  }
  async deleteAll(req: Request, res: Response) {
    try {
      const deletedContacts = await contactService.deleteAllContacts();
      return res.status(200).json({
        message: "All contacts deleted",
        data: deletedContacts,
        success: true,
      });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        message: "Failed to delete all contacts",
        error: message,
        success: false,
      });
    }
  }
}

export const contactController = new ContactController();
