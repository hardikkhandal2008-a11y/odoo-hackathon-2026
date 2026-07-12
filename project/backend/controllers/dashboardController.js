const dashboardModel = require("../models/dashboardModel");

async function getSummary(req, res) {
  const summary = await dashboardModel.getSummary();
  return res.json(summary);
}

async function getRecentActivity(req, res) {
  const activity = await dashboardModel.getRecentActivity();
  return res.json(activity);
}

module.exports = {
  getSummary,
  getRecentActivity
};
