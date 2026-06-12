const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// ✅ 1. PORTA DINÂMICA: Usa a porta fornecida pela hospedagem ou a 3000 localmente
const PORT = process.env.PORT || 3000;

// ✅ 2. CONFIGURAÇÕES DE MIDDLEWARES
app.use(express.json());
app.use(express.static(path.join(__dirname, 'site')));
app.use(express.static(__dirname)); // Mantido caso tenha arquivos na raiz

// ✅ 3. CAMINHO ABSOLUTO DO BANCO: Garante estabilidade na hospedagem
const dbPath = path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        
        // 🗑️ DELETAR A TABELA ANTIGA (Caso ela exista no arquivo .db)
        db.run(`DROP TABLE IF EXISTS profissionais`, (err) => {
            if (err) {
                console.error('Erro ao limpar tabela antiga "profissionais":', err.message);
            } else {
                console.log('Tabela antiga "profissionais" limpa/verificada com sucesso.');
            }
        });

        // TABELA 1: Profissionais
        db.run(`CREATE TABLE IF NOT EXISTS cadastro_profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            nascimento TEXT,
            sexo TEXT,
            telefone TEXT,
            email TEXT,
            cidade TEXT,
            cep TEXT,
            area TEXT,
            profissao_principal TEXT,
            tempo_experiencia TEXT,
            formacao TEXT,
            experiencia_texto TEXT
        )`);

        // TABELA 2: Solicitações de Serviços
        db.run(`CREATE TABLE IF NOT EXISTS solicitacoes_servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            cidade TEXT,
            cep TEXT,
            area TEXT,
            data_atendimento TEXT,
            descricao TEXT
        )`);

        // TABELA 3: Cadastro de Clientes
        db.run(`CREATE TABLE IF NOT EXISTS cadastro_clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            telefone TEXT,
            email TEXT,
            cidade TEXT,
            cep TEXT
        )`);
    }
});

// ==================================================
// ROTA PRINCIPAL (Alterada para index.html 🚀)
// ==================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// ==================================================
// ROTAS DO ECOSSISTEMA DE CLIENTES
// ==================================================

// ROTA POST: Cadastro de Clientes
app.post('/api/cadastrar-cliente', (req, res) => {
    const { nome, cpf, telefone, email, cidade, cep } = req.body;

    if (!nome || !cpf || !email) {
        return res.status(400).json({ erro: 'Nome, CPF e E-mail são obrigatórios.' });
    }

    const sql = `INSERT INTO cadastro_clientes (nome, cpf, telefone, email, cidade, cep) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [nome, cpf, telefone, email, cidade, cep];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Erro ao inserir cliente:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ erro: 'Este CPF já está cadastrado como cliente.' });
            }
            return res.status(500).json({ erro: 'Erro interno ao salvar no banco.' });
        }
        res.status(201).json({ mensagem: 'Cadastro realizado com sucesso!', id: this.lastID });
    });
});

// ROTA POST: Validação de Login de Cliente
app.post('/api/login-cliente', (req, res) => {
    const { nome, cpf } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({ erro: 'Nome e CPF são necessários para fazer login.' });
    }

    const query = `SELECT * FROM cadastro_clientes WHERE LOWER(nome) = LOWER(?) AND cpf = ?`;
    
    db.get(query, [nome.trim(), cpf.trim()], (err, row) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro interno na busca do banco.' });
        }
        if (!row) {
            return res.status(401).json({ erro: 'Nome ou CPF não correspondentes ou não cadastrados.' });
        }
        res.json({ mensagem: 'Login efetuado com sucesso!', cliente: { nome: row.nome, id: row.id } });
    });
});

// ROTA GET: Buscar dados do perfil
app.get('/api/perfil/:id', (req, res) => {
    const usuarioId = req.params.id;
    const query = `SELECT nome, email, cpf, telefone, cidade, cep FROM cadastro_clientes WHERE id = ?`;

    db.get(query, [usuarioId], (err, row) => {
        if (err) {
            return res.status(500).json({ erro: "Erro ao acessar o banco de dados." });
        }
        if (!row) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }
        res.json(row);
    });
});

// ROTA PUT: Atualizar email, cidade e telefone do cliente logado
app.put('/api/perfil/:id', (req, res) => {
    const usuarioId = req.params.id;
    const { email, cidade, telefone } = req.body;

    if (!email || !cidade || !telefone) {
        return res.status(400).json({ erro: 'E-mail, Cidade e Telefone são obrigatórios para a atualização.' });
    }

    const query = `
        UPDATE cadastro_clientes 
        SET email = ?, cidade = ?, telefone = ? 
        WHERE id = ?
    `;

    db.run(query, [email, cidade, telefone, usuarioId], function(err) {
        if (err) {
            console.error('Erro ao atualizar perfil no SQLite:', err.message);
            return res.status(500).json({ erro: 'Erro interno ao atualizar os dados no banco de dados.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado para atualização.' });
        }
        res.json({ mensagem: 'Perfil atualizado com sucesso diretamente no banco de dados!' });
    });
});

// ROTA DELETE: Apagar Conta logada
app.delete('/api/perfil/:id', (req, res) => {
    const usuarioId = req.params.id;
    const query = `DELETE FROM cadastro_clientes WHERE id = ?`;

    db.run(query, [usuarioId], function(err) {
        if (err) {
            console.error('Erro ao deletar registro:', err.message);
            return res.status(500).json({ erro: "Erro interno ao remover dados da tabela cadastro_clientes." });
        }
        res.json({ mensagem: "Conta removida com sucesso de nossa base de dados." });
    });
});

// ==================================================
// INTERFACE DE PROFISSIONAIS
// ==================================================

// ROTA POST: Cadastro de Profissionais
app.post('/api/cadastrar-profissional', (req, res) => {
    const { nome, cpf, nascimento, sexo, telefone, email, cidade, cep, area, princip, tempo, formacao, sugestao } = req.body;

    if (!nome || !cpf || !area) {
        return res.status(400).json({ erro: 'Nome, CPF e Área de atuação são obrigatórios.' });
    }

    const sql = `INSERT INTO cadastro_profissionais (nome, cpf, nascimento, sexo, telefone, email, cidade, cep, area, profissao_principal, tempo_experiencia, formacao, experiencia_texto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [nome, cpf, nascimento, sexo, telefone, email, cidade, cep, area, princip, tempo, formacao, sugestao];

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ erro: 'Este CPF já está cadastrado.' });
            }
            return res.status(500).json({ erro: 'Erro interno ao salvar no banco.' });
        }
        res.status(201).json({ mensagem: 'Cadastro realizado com sucesso!', id: this.lastID });
    });
});

// ROTA GET: Listar profissionais
app.get('/api/profissionais', (req, res) => {
    const query = `SELECT nome, email, telefone, cidade, area, tempo_experiencia, experiencia_texto FROM cadastro_profissionais`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==================================================
// INICIALIZAÇÃO DO SERVIDOR (Sempre no final)
// ==================================================
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Servidor online com sucesso!`);
    console.log(`📡 Porta ativa: ${PORT}`);
    console.log(`==================================================\n`);
});