export const enviroment = {
  apiBaseUrl: 'http://127.0.0.1:8000',
  endpoints: {
    authLogin: '/auth/login',
    authRegister: '/auth/register',
    authMe: '/auth/me',
    authLogout: '/auth/logout',
    chatStart: '/chats/start',
    chatMessages: (chatId: string) => `/chats/${chatId}/messages`,
    speechToText: '/api/speech-to-text',
  },
};

