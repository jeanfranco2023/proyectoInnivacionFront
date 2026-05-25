export const enviroment = {
  //apiBaseUrl: 'http://127.0.0.1:8000',
  apiBaseUrl: 'https://proyectoinnovacionback.onrender.com',
  endpoints: {
    authLogin: '/auth/login',
    authRegister: '/auth/register',
    authMe: '/auth/me',
    authTheme: '/auth/me/theme',
    authPreferences: '/auth/me/preferences',
    authProfileImage: '/auth/me/profile-image',
    authLogout: '/auth/logout',
    chats: '/chats',
    chatStart: '/chats/start',
    chatById: (chatId: string) => `/chats/${chatId}`,
    chatMessages: (chatId: string) => `/chats/${chatId}/messages`,
    promptsShare: '/prompts/share',
    promptsShared: '/prompts/shared',
    speechToText: '/api/speech-to-text',
  },
};

