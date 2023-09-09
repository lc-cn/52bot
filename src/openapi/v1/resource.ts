const apiMap = {
  gatewayURI: '/gateway',
  gatewayBotURI: '/gateway/bot',
  wsInfo: '/gateway/bot',
  groupMessagesURI: "/v2/groups/:group_id/messages",
  groupRichMediaURI : "/v2/groups/:group_id/files",
  c2cMessagesURI : "/v2/users/:user_id/messages",
  c2cRichMediaURI:"/v2/users/:user_id/files"
};
export const getURL = (endpoint: keyof typeof apiMap) => apiMap[endpoint];
