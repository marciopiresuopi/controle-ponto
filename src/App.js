// seu-projeto-react/src/App.js
// IMPORTANTE: Este é o código do seu aplicativo de relógio de ponto.
// Ele deve ser o mesmo que o código fornecido anteriormente no Canvas "Aplicativo de Relógio de Ponto e Banco de Horas".
// Ele é importado e renderizado por src/index.js.

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithCustomToken,
    signInAnonymously
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    getDocs
} from 'firebase/firestore';

// Define as variáveis globais que serão fornecidas pelo ambiente Canvas
// Em um ambiente de produção real, você precisaria configurar essas variáveis de ambiente
// ou inicializar o Firebase com suas próprias chaves de API e configurações.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Componente principal do aplicativo
function App() {
    const [user, setUser] = useState(null); // Estado para o usuário autenticado
    const [authReady, setAuthReady] = useState(false); // Indica se a autenticação foi inicializada
    const [page, setPage] = useState('login'); // Controla a página atual (login ou dashboard)
    const [firebaseDb, setFirebaseDb] = useState(null); // Instância do Firestore
    const [firebaseAuth, setFirebaseAuth] = useState(null); // Instância do Auth
    const [userId, setUserId] = useState(null); // ID do usuário autenticado ou anônimo

    // Efeito para inicializar o Firebase e configurar o listener de autenticação
    useEffect(() => {
        // Verifica se o firebaseConfig está disponível
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase configuration is missing. Please ensure '__firebase_config' is provided.");
            // Em um ambiente de produção, você pode querer renderizar uma mensagem de erro para o usuário
            return;
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        setFirebaseDb(db);
        setFirebaseAuth(auth);

        // Listener para alterações no estado de autenticação
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Se um usuário está logado, atualiza o estado
                setUser(currentUser);
                setUserId(currentUser.uid);
                setPage('dashboard');
            } else {
                // Se nenhum usuário está logado, tenta autenticar com token personalizado ou anonimamente
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        // Para um aplicativo em produção, você provavelmente não usaria signInAnonymously
                        // a menos que o aplicativo tenha funcionalidades públicas sem login.
                        // Aqui, é para o contexto do Canvas.
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Erro ao autenticar com token personalizado ou anonimamente:", error);
                    // Em um app real, você pode querer exibir um erro mais amigável
                }
                setUser(null);
                // Garante que userId está sempre definido, mesmo para usuários anônimos
                setUserId(auth.currentUser?.uid || crypto.randomUUID());
                setPage('login');
            }
            setAuthReady(true); // Marca a autenticação como pronta
        });

        // Limpa o listener ao desmontar o componente
        return () => unsubscribe();
    }, [firebaseConfig, initialAuthToken]); // Dependências: firebaseConfig e initialAuthToken

    // Função para renderizar o componente da página atual
    const renderPage = () => {
        if (!authReady) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <p className="text-xl text-gray-700">Carregando autenticação...</p>
                </div>
            );
        }

        switch (page) {
            case 'login':
                return <AuthComponent auth={firebaseAuth} setPage={setPage} db={firebaseDb} userId={userId} />;
            case 'dashboard':
                return <DashboardComponent user={user} auth={firebaseAuth} db={firebaseDb} userId={userId} appId={appId} />;
            default:
                return <AuthComponent auth={firebaseAuth} setPage={setPage} db={firebaseDb} userId={userId} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            {renderPage()}
        </div>
    );
}

// Componente para Autenticação (Login e Registro)
function AuthComponent({ auth, setPage, db, userId }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false); // Controla se está no modo de registro

    // Função para lidar com o login
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // Limpa mensagens de erro anteriores
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setPage('dashboard'); // Redireciona para o dashboard após o login
        } catch (err) {
            setError('Erro ao fazer login: ' + err.message);
        }
    };

    // Função para lidar com o registro
    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); // Limpa mensagens de erro anteriores
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Salva dados adicionais do usuário (ex: email) em um documento privado no Firestore
            const userRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/private_user_data`, 'profile');
            await setDoc(userRef, {
                email: userCredential.user.email,
                createdAt: serverTimestamp(),
                // Adicione outros campos de perfil conforme necessário
            });
            setPage('dashboard'); // Redireciona para o dashboard após o registro
        } catch (err) {
            setError('Erro ao registrar: ' + err.message);
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                {isRegistering ? 'Registrar' : 'Login'}
            </h2>
            <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                        Senha
                    </label>
                    <input
                        type="password"
                        id="password"
                        className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200"
                    >
                        {isRegistering ? 'Registrar' : 'Entrar'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="inline-block align-baseline font-bold text-sm text-blue-600 hover:text-blue-800 transition duration-200"
                    >
                        {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Registre-se'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Componente do Dashboard
function DashboardComponent({ user, auth, db, userId, appId }) {
    const [clockedIn, setClockedIn] = useState(false); // Estado para saber se o usuário está logado
    const [timeEntries, setTimeEntries] = useState([]); // Entradas de ponto do usuário
    const [timeOffBank, setTimeOffBank] = useState({ accruedHours: 0, usedHours: 0 }); // Banco de horas
    const [message, setMessage] = useState(''); // Mensagens de feedback ao usuário

    // Efeito para carregar dados do usuário e configurar listeners em tempo real
    useEffect(() => {
        if (!db || !user || !userId) return;

        // Listener para o estado de ponto (clockedIn)
        const userStatusRef = doc(db, `artifacts/${appId}/users/${userId}/private_user_data`, 'status');
        const unsubscribeStatus = onSnapshot(userStatusRef, (docSnap) => {
            if (docSnap.exists()) {
                setClockedIn(docSnap.data().clockedIn || false);
            } else {
                // Se o documento não existe, significa que o usuário não está logado
                setClockedIn(false);
                // Cria o documento de status se não existir
                setDoc(userStatusRef, { clockedIn: false }, { merge: true }).catch(e => console.error("Erro ao criar status doc:", e));
            }
        }, (error) => console.error("Erro ao carregar status:", error));

        // Listener para as entradas de ponto do usuário
        const timeEntriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/private_user_data/time_entries`);
        const timeEntriesQuery = query(
            timeEntriesCollectionRef,
            where('userId', '==', userId)
            // Não usando orderBy para evitar erros de índice, ordenaremos no frontend
        );
        const unsubscribeTimeEntries = onSnapshot(timeEntriesQuery, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordena as entradas por data/hora de forma descendente (mais recente primeiro)
            entries.sort((a, b) => (b.clockInTime?.toDate() || 0) - (a.clockInTime?.toDate() || 0));
            setTimeEntries(entries);
        }, (error) => console.error("Erro ao carregar entradas de tempo:", error));

        // Listener para o banco de horas do usuário
        const timeOffBankRef = doc(db, `artifacts/${appId}/users/${userId}/private_user_data`, 'time_off_bank');
        const unsubscribeTimeOffBank = onSnapshot(timeOffBankRef, (docSnap) => {
            if (docSnap.exists()) {
                setTimeOffBank(docSnap.data());
            } else {
                // Inicializa o banco de horas se não existir
                setDoc(timeOffBankRef, { accruedHours: 0, usedHours: 0 }, { merge: true }).catch(e => console.error("Erro ao inicializar banco de horas:", e));
            }
        }, (error) => console.error("Erro ao carregar banco de horas:", error));

        // Limpa os listeners ao desmontar o componente
        return () => {
            unsubscribeStatus();
            unsubscribeTimeEntries();
            unsubscribeTimeOffBank();
        };
    }, [db, user, userId, appId]); // Dependências

    // Função para registrar entrada (clock in)
    const handleClockIn = async () => {
        try {
            const timeEntriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/private_user_data/time_entries`);
            await addDoc(timeEntriesCollectionRef, {
                userId: userId,
                clockInTime: serverTimestamp(), // Marca a hora de entrada
                clockOutTime: null, // Ainda não saiu
            });

            // Atualiza o status do usuário para "clockedIn"
            const userStatusRef = doc(db, `artifacts/${appId}/users/${userId}/private_user_data`, 'status');
            await setDoc(userStatusRef, { clockedIn: true }, { merge: true });

            setMessage('Entrada registrada com sucesso!');
        } catch (error) {
            console.error('Erro ao registrar entrada:', error);
            setMessage('Erro ao registrar entrada.');
        }
    };

    // Função para registrar saída (clock out)
    const handleClockOut = async () => {
        try {
            // Busca a última entrada de ponto não finalizada para este usuário
            const q = query(
                collection(db, `artifacts/${appId}/users/${userId}/private_user_data/time_entries`),
                where('userId', '==', userId),
                where('clockOutTime', '==', null)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const latestEntryDoc = snapshot.docs[0];
                const entryId = latestEntryDoc.id;

                // Atualiza a entrada com a hora de saída
                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/private_user_data/time_entries`, entryId), {
                    clockOutTime: serverTimestamp(),
                });

                // Calcula as horas trabalhadas e atualiza o banco de horas
                const clockIn = latestEntryDoc.data().clockInTime.toDate();
                const clockOut = new Date(); // Usa a hora atual para o cálculo
                const durationMs = clockOut - clockIn;
                const hoursWorked = durationMs / (1000 * 60 * 60); // Converte milissegundos para horas

                const timeOffBankRef = doc(db, `artifacts/${appId}/users/${userId}/private_user_data`, 'time_off_bank');
                const currentBank = (await getDoc(timeOffBankRef)).data() || { accruedHours: 0, usedHours: 0 };
                const newAccruedHours = (currentBank.accruedHours || 0) + hoursWorked;

                await setDoc(timeOffBankRef, {
                    accruedHours: newAccruedHours,
                    usedHours: currentBank.usedHours || 0
                }, { merge: true });

                // Atualiza o status do usuário para "não clockedIn"
                const userStatusRef = doc(db, `artifacts/${appId}/users/${userId}/private_user_data`, 'status');
                await setDoc(userStatusRef, { clockedIn: false }, { merge: true });

                setMessage('Saída registrada e banco de horas atualizado!');
            } else {
                setMessage('Nenhuma entrada de ponto aberta encontrada.');
            }
        } catch (error) {
            console.error('Erro ao registrar saída:', error);
            setMessage('Erro ao registrar saída.');
        }
    };

    // Função para fazer logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // O onAuthStateChanged no componente App cuidará da mudança de página
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    // Função auxiliar para formatar a data
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleString('pt-BR'); // Formato de data e hora localizado
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard do Funcionário</h2>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200"
                >
                    Sair
                </button>
            </div>

            <p className="text-gray-600 mb-4">Bem-vindo, {user?.email}!</p>
            <p className="text-gray-600 mb-4 text-sm">Seu ID de Usuário (para compartilhamento): <span className="font-mono bg-gray-200 p-1 rounded">{userId}</span></p>

            {message && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded" role="alert">
                    <p>{message}</p>
                </div>
            )}

            <div className="mb-8 p-4 bg-gray-50 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Relógio de Ponto</h3>
                <div className="flex space-x-4">
                    <button
                        onClick={handleClockIn}
                        disabled={clockedIn}
                        className={`py-3 px-6 rounded-lg font-bold text-white transition duration-300 transform ${
                            clockedIn ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg hover:scale-105'
                        }`}
                    >
                        Bater Ponto - ENTRADA
                    </button>
                    <button
                        onClick={handleClockOut}
                        disabled={!clockedIn}
                        className={`py-3 px-6 rounded-lg font-bold text-white transition duration-300 transform ${
                            !clockedIn ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-lg hover:scale-105'
                        }`}
                    >
                        Bater Ponto - SAÍDA
                    </button>
                </div>
                <p className="mt-4 text-lg text-gray-700">
                    Status Atual: <span className={`font-bold ${clockedIn ? 'text-green-600' : 'text-red-600'}`}>
                        {clockedIn ? 'Entrada Registrada' : 'Saída Registrada'}
                    </span>
                </p>
            </div>

            <div className="mb-8 p-4 bg-gray-50 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Banco de Horas</h3>
                <p className="text-lg text-gray-700 mb-2">
                    Horas Acumuladas: <span className="font-bold text-blue-600">{timeOffBank.accruedHours?.toFixed(2) || '0.00'}</span> horas
                </p>
                <p className="text-lg text-gray-700">
                    Horas Utilizadas: <span className="font-bold text-purple-600">{timeOffBank.usedHours?.toFixed(2) || '0.00'}</span> horas
                </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Histórico de Ponto</h3>
                {timeEntries.length === 0 ? (
                    <p className="text-gray-600">Nenhuma entrada de ponto registrada ainda.</p>
                ) : (
                    <ul className="space-y-3">
                        {timeEntries.map((entry) => (
                            <li key={entry.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                <p className="text-gray-800 font-medium">Entrada: <span className="text-blue-700">{formatTimestamp(entry.clockInTime)}</span></p>
                                <p className="text-gray-800 font-medium">Saída: <span className="text-red-700">{formatTimestamp(entry.clockOutTime)}</span></p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// Exporta o componente principal App
export default App;