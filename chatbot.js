// =====================================
// IMPORTAÇÕES
// =====================================
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

// =====================================
// CONFIGURAÇÃO DO CLIENTE
// =====================================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// =====================================
// CONTROLE DE ESTADO
// =====================================
const clientes = {}; // fluxo (pedido etc)
const clientesEmAtendimento = {}; // humano assumiu

// =====================================
// QR CODE
// =====================================
client.on("qr", (qr) => {
  console.log("📲 Escaneie o QR Code:");
  qrcode.generate(qr, { small: true });
});

// =====================================
// CONECTADO
// =====================================
client.on("ready", () => {
  console.log("✅ WhatsApp conectado!");
});

// =====================================
// INICIAR
// =====================================
client.initialize();

// =====================================
// DELAY
// =====================================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// =====================================
// BASE DE PRODUTOS (LOCAL)
// =====================================
const produtos = [
  { nome: "estojo", preco: 12.9, desconto30: 12.6, desconto50: 12.4, minimo: 10 },
  { nome: "estojo_box", preco: 12.49, desconto30: 12.19, desconto50: 11.99, minimo: 10 },
  { nome: "estojo_slim", preco: 8.99, desconto30: 8.69, desconto50: 8.49, minimo: 10 },
  { nome: "mini mala", preco: 18.25, desconto30: 17.95, desconto50: 17.75, minimo: 10 },
  { nome: "mala m", preco: 24.99, desconto30: 24.69, desconto50: 24.49, minimo: 10 },
];

// =====================================
// MENSAGENS
// =====================================
client.on("message", async (msg) => {
  try {
    if (!msg.from || msg.from.endsWith("@g.us")) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const texto = msg.body ? msg.body.trim().toLowerCase() : "";

    const typing = async () => {
      await delay(1000);
      await chat.sendStateTyping();
      await delay(1000);
    };

    // =====================================
    // BLOQUEIA SE HUMANO ASSUMIU
    // =====================================
    if (clientesEmAtendimento[msg.from]) return;

    // =====================================
    // MENU
    // =====================================
    if (/^(menu|oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(texto)) {
      await typing();

      await client.sendMessage(
        msg.from,
`Olá! 👋

Bem-vindo(a) à *H1 Brindes Personalizados* 💖

Escolha uma opção:

1️⃣ Ver Catálogo  
2️⃣ Fazer Orçamento  
3️⃣ Prazo  
4️⃣ Falar com Atendente  

Digite *menu* para voltar 😉`
      );
    }

    // =====================================
    // OPÇÕES
    // =====================================
    else if (texto === "1") {
  await typing();
  await client.sendMessage(
    msg.from,
    "🎨 *Catálogo:* https://drive.google.com/file/d/11wkegGQYXuhiH87ahf2Jxiu2QPrBvbNR/view?usp=drive_link"
  );
}

    else if (texto === "2") {
      await typing();
      await client.sendMessage(msg.from, "💰 Me envie o *produto + quantidade* 😊");
    }

    else if (texto === "3") {
      await typing();
      await client.sendMessage(msg.from, "📦 Prazo: até 20 dias úteis + frete");
    }

    // =====================================
    // HUMANO ASSUME
    // =====================================
    else if (texto === "4" || /atendente/i.test(texto)) {
      clientesEmAtendimento[msg.from] = true;

      await typing();
      await client.sendMessage(
        msg.from,
        "👩‍💼 Um atendente vai continuar seu atendimento, aguarde 😊"
      );
    }

    // =====================================
    // FINALIZAR PEDIDO
    // =====================================
    else if (/comprar|fechar|pedido/i.test(texto)) {
      clientes[msg.from] = { etapa: "dados" };

      await typing();
      await client.sendMessage(
        msg.from,
`🛍️ *Perfeito!*

Envie todos os dados abaixo de uma vez 👇

*Nome completo:*  
*Endereço completo:*  
*CEP:*  
*CPF:*  
*Data da festa:*  

Assim agilizamos seu pedido 💖`
      );
    }

    // =====================================
    // RECEBE DADOS DO CLIENTE
    // =====================================
    else if (clientes[msg.from]?.etapa === "dados") {
      delete clientes[msg.from];

      clientesEmAtendimento[msg.from] = true;

      await typing();
      await client.sendMessage(
        msg.from,
`✅ *Pedido recebido com sucesso!*

Nossa equipe já vai dar continuidade no seu atendimento 💖`
      );
    }

    // =====================================
    // ORÇAMENTO AUTOMÁTICO
    // =====================================
    else {
      const quantidadeMatch = texto.match(/\d+/);
      const qtd = quantidadeMatch ? parseInt(quantidadeMatch[0]) : null;

      if (!qtd) return;

      let produto = produtos.find((p) =>
        texto.includes(p.nome.toLowerCase())
      );

      if (!produto) return;

      await typing();

      if (qtd < produto.minimo) {
        return client.sendMessage(
          msg.from,
          `⚠️ Pedido mínimo: ${produto.minimo}`
        );
      }

      let valor = produto.preco;

      if (qtd >= 50) valor = produto.desconto50;
      else if (qtd >= 30) valor = produto.desconto30;

      const total = valor * qtd;

      await client.sendMessage(
        msg.from,
`💰 *Orçamento*

🛍️ Produto: ${produto.nome}  
📦 Quantidade: ${qtd}  
💵 Unitário: R$ ${valor.toFixed(2)}

💲 *Total: R$ ${total.toFixed(2)}*

⏱️ Produção: até 20 dias úteis + frete  

Digite *comprar* para finalizar 😊`
      );
    }

  } catch (error) {
    console.error("❌ Erro:", error);
  }
});