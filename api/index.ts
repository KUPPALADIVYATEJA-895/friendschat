// Vercel Serverless Function entry point for /api/* routes
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  // GET /api/rooms/open
  if (req.method === 'GET' && url.includes('/rooms/open')) {
    return res.status(200).json([]);
  }

  // POST /api/rooms
  if (req.method === 'POST' && url.includes('/rooms')) {
    const body = req.body || {};
    const hostName = (body.hostName || 'Host').trim();
    const roomName = (body.roomName || `${hostName}'s Monolith`).trim();
    const timer = body.timer || 'none';
    const openToJoin = Boolean(body.openToJoin);
    const liveVoiceEnabled = Boolean(body.liveVoiceEnabled);

    const roomId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    
    // Generate 6-character code
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += Math.floor(Math.random() * 10).toString();
    for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));

    const hostSecret = 'hs_' + Math.random().toString(36).substring(2, 15);
    const hostId = 'usr_' + Math.random().toString(36).substring(2, 12);
    const createdAt = Date.now();

    const room = {
      id: roomId,
      code,
      name: roomName,
      hostId,
      hostName,
      timer,
      openToJoin,
      liveVoiceEnabled,
      createdAt,
      participants: [
        {
          id: hostId,
          name: hostName,
          isHost: true,
          joinedAt: createdAt,
          lastActive: createdAt,
        },
      ],
      messages: [],
    };

    return res.status(200).json({
      roomId,
      code,
      hostSecret,
      hostId,
      room,
    });
  }

  // Health / Default
  return res.status(200).json({ status: 'ok', monolith: 'online' });
}
