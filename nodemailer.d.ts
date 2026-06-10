declare module 'nodemailer' {
  export interface Transporter {
    sendMail(options: any): Promise<any>;
  }
  
  export interface TransportOptions {
    service: string;
    auth: {
      user: string;
      pass: string;
    };
  }
  
  export function createTransporter(options: TransportOptions): Transporter;
  
  const nodemailer: {
    createTransporter: (options: TransportOptions) => Transporter;
  };
  
  export default nodemailer;
}
