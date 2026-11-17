
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import path from "node:path";
import { fileURLToPath } from "node:url";

// Obter o caminho do ficheiro atual
const __filename = fileURLToPath(import.meta.url);

// Recriar o __dirname para ES Modules
const __dirname = path.dirname(__filename);

// Carregar o ficheiro .env
const resultado = dotenv.config({
    path: path.join(__dirname, ".env")
});

// Verificar se o .env foi carregado
if (resultado.error) {
    console.error("Erro ao carregar .env:", resultado.error);
    process.exit(1);
}

// Verificar as variáveis de ambiente
console.log("Verificação das variáveis:");
console.log("EMAIL_USER:", !!process.env.EMAIL_USER);
console.log("EMAIL_PASS:", !!process.env.EMAIL_PASS);
console.log("EMAIL_DESTINO:", !!process.env.EMAIL_DESTINO);


const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '10kb' }));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Foram enviados demasiados pedidos. Tente novamente mais tarde.' }
});

const requiredEnv = ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL_DESTINO'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length) {
  console.error(`Faltam variáveis no ficheiro .env: ${missingEnv.join(', ')}`);
  process.exit(1);
}
 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
 /*
VERIFICAÇÃO DO TRANSPORTER
 */
transporter.verify()
    .then(() => {
        console.log('Ligação SMTP estabelecida com sucesso!');
    })
    .catch((error) => {
        console.error('Erro na ligação SMTP:', error.message);
    });
///////////////////

app.get('/', (_req, res) => {
  res.status(200).send('API da Jornes Gráfica está operacional.');
});

app.post('/api/contacto', contactLimiter, async (req, res) => {
  const { nome, telefone, email = '', motivo, mensagem } = req.body || {};

  const data = {
    nome: typeof nome === 'string' ? nome.trim() : '',
    telefone: typeof telefone === 'string' ? telefone.trim() : '',
    email: typeof email === 'string' ? email.trim() : '',
    motivo: typeof motivo === 'string' ? motivo.trim() : '',
    mensagem: typeof mensagem === 'string' ? mensagem.trim() : ''
  };

  if (!data.nome || !data.telefone || !data.motivo || !data.mensagem) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  if (data.nome.length > 120 || data.telefone.length > 40 ||
      data.motivo.length > 120 || data.mensagem.length > 5000) {
    return res.status(400).json({ message: 'Um ou mais campos excedem o tamanho permitido.' });
  }

  if (!/^[+0-9()\s.-]{7,40}$/.test(data.telefone)) {
    return res.status(400).json({ message: 'Introduza um número de telefone válido.' });
  }

  if (data.email && (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) {
    return res.status(400).json({ message: 'Introduza um endereço de e-mail válido.' });
  }

  const adminMail = {
    from: { name: 'Jornes Gráfica - Website', address: process.env.EMAIL_USER },
    to: process.env.EMAIL_DESTINO,
    ...(data.email ? { replyTo: data.email } : {}),
    subject: `Novo pedido no website: ${data.motivo}`,
    text: [
      'Novo pedido recebido através do website da Jornes Gráfica.',
      '',
      `Nome: ${data.nome}`,
      `Telefone: ${data.telefone}`,
      `E-mail: ${data.email || 'Não indicado'}`,
      `Motivo: ${data.motivo}`,
      '',
      'Mensagem:',
      data.mensagem
    ].join('\n')
  };

  try {
    // Primeiro garantimos que a administração recebe o pedido.
    await transporter.sendMail(adminMail);
  } catch (error) {
    console.error('Falha ao enviar notificação à administração:', error);
    return res.status(502).json({ message: 'Não foi possível enviar o pedido neste momento. Tente novamente.' });
  }

  // O e-mail do cliente é opcional no formulário.
  if (!data.email) {
    return res.status(200).json({
      success: true,
      confirmationSent: false,
      message: 'O seu pedido foi enviado com sucesso. Obrigado pelo contacto!'
    });
  }

  const customerMail = {
    from: { name: 'Jornes Gráfica', address: process.env.EMAIL_USER },
    to: data.email,
    subject: 'Recebemos o seu pedido | Jornes Gráfica',
    text: [
      `Olá, ${data.nome}!`,
      '',
      'A Jornes Gráfica agradece o seu contacto.',
      `Recebemos o seu pedido sobre: ${data.motivo}.`,
      'A nossa equipa irá analisar a sua solicitação e, se necessário, entrará em contacto consigo.',
      '',
      'Obrigado pela preferência,',
      'Jornes Gráfica'
    ].join('\n')
  };

  try {
    await transporter.sendMail(customerMail);
    return res.status(200).json({
      success: true,
      confirmationSent: true,
      message: 'Pedido enviado! Também enviámos uma confirmação para o seu e-mail.'
    });
  } catch (error) {
    // O pedido já chegou à administração; não pedimos ao cliente para o reenviar.
    console.error('Pedido recebido, mas falhou a confirmação ao cliente:', error);
    return res.status(200).json({
      success: true,
      confirmationSent: false,
      message: 'O seu pedido foi recebido pela Jornes Gráfica. Não foi possível enviar a confirmação por e-mail.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`API da Jornes Gráfica ativa em http://localhost:${PORT}`);
});
