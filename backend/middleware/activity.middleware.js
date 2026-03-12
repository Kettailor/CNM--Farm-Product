const prisma = require('../config/prisma');

async function activityMiddleware(req, _res, next) {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isMutation || req.path.startsWith('/api/auth')) return next();

  resEndWrap(req, async () => {
    await prisma.activityLog.create({
      data: {
        projectId: req.body.projectId || req.query.projectId || null,
        userId: req.user?.id || null,
        action: `${req.method} ${req.path}`,
        metadata: req.body || null,
      },
    }).catch(() => null);
  });

  next();
}

function resEndWrap(req, callback) {
  const original = req.res.end;
  req.res.end = function wrappedEnd(...args) {
    callback();
    return original.apply(this, args);
  };
}

module.exports = activityMiddleware;
