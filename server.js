const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'site')));

// Conecta ou cria o arquivo do banco de dados
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Erro no banco:', err.message);
    else console.log('Banco de dados conectado com sucesso!');
});

// Cria a tabela adaptada exatamente com TODOS os campos do seu formulário
db.run(`CREATE TABLE IF NOT EXISTS profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cpf TEXT,
    nascimento TEXT,
    sexo TEXT,
    telefone TEXT,
    email TEXT,
    cidade TEXT,
    cep TEXT,
    area TEXT,
    princip TEXT,
    tempo TEXT,
    formacao TEXT,
    sugestao TEXT
)`);

// Abre a sua página HTML ao acessar http://localhost:3000
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'site', 'Profissional.html'));
});

// Recebe e guarda os dados coletados do formulário
app.post('/cadastrar', (req, res) => {
    const { nome, cpf, nascimento, sexo, telefone, email, cidade, cep, area, princip, tempo, formacao, sugestao } = req.body;

    const sql = `INSERT INTO profissionais (nome, cpf, nascimento, sexo, telefone, email, cidade, cep, area, princip, tempo, formacao, sugestao) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [nome, cpf, nascimento, sexo, telefone, email, cidade, cep, area, princip, tempo, formacao, sugestao];

    db.run(sql, params, function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Erro ao salvar no banco de dados.');
        }
        res.send('<h1>Cadastro realizado com sucesso!</h1><br><a href="/">Voltar ao formulário</a>');
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});