var DataTypes = require("sequelize").DataTypes;
var _appointments = require("./appointments");
var _case_studies = require("./case_studies");
var _case_study_images = require("./case_study_images");
var _case_study_pdfs = require("./case_study_pdfs");
var _code_attributes = require("./code_attributes");
var _coupon_usage = require("./coupon_usage");
var _coupons = require("./coupons");
var _group_code = require("./group_code");
var _jobs = require("./jobs");
var _packages = require("./packages");
var _payment = require("./payment");
var _reviews = require("./reviews");
var _subscribers = require("./subscribers");
var _token = require("./token");
var _transactions = require("./transactions");
var _users = require("./users");

function initModels(sequelize) {
  var appointments = _appointments(sequelize, DataTypes);
  var case_studies = _case_studies(sequelize, DataTypes);
  var case_study_images = _case_study_images(sequelize, DataTypes);
  var case_study_pdfs = _case_study_pdfs(sequelize, DataTypes);
  var code_attributes = _code_attributes(sequelize, DataTypes);
  var coupon_usage = _coupon_usage(sequelize, DataTypes);
  var coupons = _coupons(sequelize, DataTypes);
  var group_code = _group_code(sequelize, DataTypes);
  var jobs = _jobs(sequelize, DataTypes);
  var packages = _packages(sequelize, DataTypes);
  var payment = _payment(sequelize, DataTypes);
  var reviews = _reviews(sequelize, DataTypes);
  var subscribers = _subscribers(sequelize, DataTypes);
  var token = _token(sequelize, DataTypes);
  var transactions = _transactions(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  case_study_images.belongsTo(case_studies, { as: "case_study", foreignKey: "case_study_id"});
  case_studies.hasMany(case_study_images, { as: "case_study_images", foreignKey: "case_study_id"});
  case_study_pdfs.belongsTo(case_studies, { as: "case_study", foreignKey: "case_study_id"});
  case_studies.hasMany(case_study_pdfs, { as: "case_study_pdfs", foreignKey: "case_study_id"});
  coupon_usage.belongsTo(coupons, { as: "coupon", foreignKey: "coupon_id"});
  coupons.hasMany(coupon_usage, { as: "coupon_usages", foreignKey: "coupon_id"});
  code_attributes.belongsTo(group_code, { as: "group_code", foreignKey: "group_code_id"});
  group_code.hasMany(code_attributes, { as: "code_attributes", foreignKey: "group_code_id"});
  subscribers.belongsTo(packages, { as: "package", foreignKey: "package_id"});
  packages.hasMany(subscribers, { as: "subscribers", foreignKey: "package_id"});
  appointments.belongsTo(users, { as: "host_user", foreignKey: "host_user_id"});
  users.hasMany(appointments, { as: "appointments", foreignKey: "host_user_id"});
  appointments.belongsTo(users, { as: "doctor_user", foreignKey: "doctor_user_id"});
  users.hasMany(appointments, { as: "doctor_user_appointments", foreignKey: "doctor_user_id"});
  case_studies.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(case_studies, { as: "case_studies", foreignKey: "user_id"});
  coupon_usage.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(coupon_usage, { as: "coupon_usages", foreignKey: "user_id"});
  jobs.belongsTo(users, { as: "doctor_user", foreignKey: "doctor_user_id"});
  users.hasMany(jobs, { as: "jobs", foreignKey: "doctor_user_id"});
  reviews.belongsTo(users, { as: "given_by_user", foreignKey: "given_by_user_id"});
  users.hasMany(reviews, { as: "reviews", foreignKey: "given_by_user_id"});
  reviews.belongsTo(users, { as: "given_to_user", foreignKey: "given_to_user_id"});
  users.hasMany(reviews, { as: "given_to_user_reviews", foreignKey: "given_to_user_id"});
  subscribers.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(subscribers, { as: "subscribers", foreignKey: "user_id"});
  token.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(token, { as: "tokens", foreignKey: "user_id"});
  transactions.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(transactions, { as: "transactions", foreignKey: "user_id"});

  return {
    appointments,
    case_studies,
    case_study_images,
    case_study_pdfs,
    code_attributes,
    coupon_usage,
    coupons,
    group_code,
    jobs,
    packages,
    payment,
    reviews,
    subscribers,
    token,
    transactions,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
