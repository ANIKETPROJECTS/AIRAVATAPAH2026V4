import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Upload, CheckCircle2, XCircle, Loader2, FileText,
  User, Landmark, FileStack, Sprout,
  ClipboardCheck, UserCheck, Pencil, ThumbsUp, Camera,
  ArrowRight, ArrowLeft, ChevronRight, ChevronDown,
  Sparkles, AlertTriangle, CircleAlert, Info, ShieldCheck,
  X, ZoomIn, Image,
} from "lucide-react";
import { apiCreateFarmer, apiSaveDocumentImages, notifyFarmerChange } from "@/data/farmerApi";


const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export type LangCode = "mr" | "hi" | "en";

type LangMap = { mr: string; hi: string; en: string };

const FIELD_LABEL_MAP: Record<string, LangMap> = {
  // Form 8A fields
  "year":              { mr: "वर्ष",                                   hi: "वर्ष",                                   en: "Year / Financial Year" },
  "report_date":       { mr: "अहवाल दिनांक",                          hi: "रिपोर्ट दिनांक",                         en: "Report Date" },
  "village":           { mr: "गाव",                                    hi: "गाँव",                                    en: "Village" },
  "taluka":            { mr: "तालुका",                                 hi: "तहसील",                                   en: "Taluka" },
  "district":          { mr: "जिल्हा",                                 hi: "जिला",                                    en: "District" },
  "khate_number":      { mr: "खाते क्रमांक",                          hi: "खाता संख्या",                             en: "Account Number" },
  "account_type":      { mr: "खात्याचा प्रकार",                       hi: "खाते का प्रकार",                          en: "Account Type" },

  "khatedar_address":  { mr: "खातेदाराचा पत्ता",                      hi: "खाताधारक का पता",                         en: "Address of Land Holder" },
  "total_area":        { mr: "एकूण क्षेत्र",                          hi: "कुल क्षेत्रफल",                          en: "Total Land Area" },
  "total_assessment":  { mr: "एकूण आकारणी किंवा जुडी",               hi: "कुल भू-राजस्व / जमाबंदी",                en: "Total Assessment / Judi" },
  "total_damage":      { mr: "एकूण दुमाला जमिनीवरील नुकसान",         hi: "कुल दुमाला भूमि पर कमी",                 en: "Total Damage on Inherited Land" },
  "total_zp":          { mr: "एकूण जि.प. स्थानिक उपकर",              hi: "कुल जिला परिषद स्थानीय उपकर",            en: "Total Zilla Parishad Local Cess" },
  "total_gp":          { mr: "एकूण ग्रा.प. स्थानिक उपकर",            hi: "कुल ग्राम पंचायत स्थानीय उपकर",         en: "Total Gram Panchayat Local Cess" },
  "total_recovery":    { mr: "एकूण वसुलीसाठी",                       hi: "कुल वसूली के लिए",                       en: "Total Recovery Amount" },
  "village_form_6":    { mr: "गाव नमुना सहा मधील नोंद",              hi: "ग्राम प्रपत्र छह में प्रविष्टि",         en: "Entry in Village Form 6" },
  "survey_number":     { mr: "भूमापन क्रमांक व उपविभाग क्रमांक",     hi: "सर्वे नंबर और उपखंड नंबर",               en: "Survey No. & Sub-division" },
  "land_holding":      { mr: "धारण क्षेत्र",                          hi: "धारित क्षेत्र",                          en: "Land Holding Area" },
  "cultivable":        { mr: "लागवडी योग्य क्षेत्र",                  hi: "कृषि योग्य क्षेत्र",                    en: "Cultivable Area" },
  "waste_land":        { mr: "पोटखराब क्षेत्र",                       hi: "बंजर / अनुपजाऊ भूमि",                   en: "Waste Land Area" },
  // Aadhaar fields
  "full_name":         { mr: "पूर्ण नाव",                             hi: "पूरा नाम",                               en: "Full Name" },
  "aadhaar_number":    { mr: "आधार क्रमांक",                          hi: "आधार संख्या",                             en: "Aadhaar Number" },
  "virtual_id":        { mr: "व्हर्च्युअल आयडी (VID)",                hi: "वर्चुअल आईडी (VID)",                     en: "Virtual ID (VID)" },
  "vid":               { mr: "व्हर्च्युअल आयडी (VID)",                hi: "वर्चुअल आईडी (VID)",                     en: "Virtual ID (VID)" },
  "date_of_birth":     { mr: "जन्मतारीख",                             hi: "जन्म तिथि",                              en: "Date of Birth" },
  "gender":            { mr: "लिंग",                                   hi: "लिंग",                                   en: "Gender" },
  "father":            { mr: "वडील / पती / पालक यांचे नाव",           hi: "पिता / पति / अभिभावक का नाम",           en: "Father's / Husband's / Guardian's Name" },
  "fathers_or_husbands_name": { mr: "वडील / पती / पालक यांचे नाव",   hi: "पिता / पति / अभिभावक का नाम",           en: "Father's / Husband's / Guardian's Name" },
  "care_of":           { mr: "पालक",                                   hi: "देखरेख",                                 en: "Care Of" },
  "mobile_number":     { mr: "मोबाईल क्रमांक",                        hi: "मोबाइल नंबर",                            en: "Mobile Number" },
  "pincode":           { mr: "पिन कोड",                               hi: "पिन कोड",                                en: "PIN Code" },
  "state":             { mr: "राज्य",                                  hi: "राज्य",                                  en: "State" },
  "issue_date":        { mr: "जारी दिनांक",                           hi: "जारी तिथि",                              en: "Issue Date" },
  "enrolment_number":  { mr: "नोंदणी क्रमांक",                        hi: "नामांकन संख्या",                         en: "Enrolment No." },
  // Bank Passbook fields
  "bank_name":         { mr: "बँकेचे नाव",                            hi: "बैंक का नाम",                            en: "Bank Name" },
  "branch_name":       { mr: "शाखेचे नाव",                            hi: "शाखा का नाम",                            en: "Branch Name" },
  "branch_address":    { mr: "शाखेचा पत्ता",                          hi: "शाखा का पता",                            en: "Branch Address" },
  "ifsc_code":         { mr: "IFSC कोड",                              hi: "IFSC कोड",                               en: "IFSC Code" },
  "micr_code":         { mr: "MICR कोड",                              hi: "MICR कोड",                               en: "MICR Code" },
  "account_holder_name":{ mr: "खातेदाराचे नाव",                      hi: "खाताधारक का नाम",                        en: "Account Holder Name" },
  "customer_address":  { mr: "ग्राहकाचा पत्ता",                       hi: "ग्राहक का पता",                          en: "Customer Address" },
  "account_number":    { mr: "खाते क्रमांक",                          hi: "खाता संख्या",                             en: "Account Number" },
  "opening_date":      { mr: "खाते उघडण्याची तारीख",                  hi: "खाता खोलने की तिथि",                    en: "Account Opening Date" },
  "customer_id":       { mr: "ग्राहक आयडी (CIF)",                     hi: "ग्राहक आईडी (CIF)",                      en: "Customer ID (CIF)" },
  "nominee_relationship":{ mr: "नॉमिनीचे नाते",                       hi: "नामांकित का संबंध",                      en: "Nominee Relationship" },
  "email":             { mr: "ईमेल पत्ता",                            hi: "ईमेल पता",                               en: "Email Address" },
  // Form 7 fields
  "pu_id":             { mr: "PU-ID",                                  hi: "PU-ID",                                  en: "PU-ID" },
  "occupant_class":    { mr: "भोगवटदार वर्ग",                         hi: "अधिवासी वर्ग",                           en: "Occupant Class" },
  "owner_names":       { mr: "मालकाचे नाव",                           hi: "स्वामी का नाम",                          en: "Owner Name(s)" },
  "owner_share":       { mr: "मालकाचा हिस्सा",                        hi: "स्वामी का हिस्सा",                       en: "Owner Share / Hissa" },
  "mode_of_acquisition":{ mr: "संपादनाचा प्रकार",                    hi: "अधिग्रहण का तरीका",                      en: "Mode of Acquisition" },
  "land_revenue_assessment":{ mr: "जमीन महसूल आकारणी",               hi: "भू-राजस्व आकलन",                        en: "Land Revenue Assessment" },
  "collection_charges":{ mr: "वसुली शुल्क",                           hi: "संग्रह शुल्क",                           en: "Collection Charges" },
  "non_cultivated_area":{ mr: "बिन शेती क्षेत्र",                    hi: "अकृषित क्षेत्र",                         en: "Non-Cultivated Area" },
  "tenant_rent":       { mr: "खंड",                                    hi: "किराया",                                 en: "Tenant Rent" },
  "boundary_and_survey_marks":{ mr: "सीमा आणि सर्वेक्षण खुणा",       hi: "सीमा और सर्वेक्षण चिह्न",               en: "Boundary & Survey Marks" },
  "last_mutation_number":{ mr: "शेवटचा फेरफार क्र.",                  hi: "अंतिम म्यूटेशन क्र.",                    en: "Last Mutation No." },
  // Form 12 fields
  "crop_name":         { mr: "पिकांचे नाव",                           hi: "फसल का नाम",                             en: "Primary Crop" },
  "crop":              { mr: "पिकांचे नाव",                           hi: "फसल का नाम",                             en: "Primary Crop" },
  // Raw table header aliases (API returns mixed English/Marathi headers)
  "area_/_extent":              { mr: "क्षेत्र",                         hi: "क्षेत्रफल",                          en: "Area / Extent" },
  "area":                       { mr: "क्षेत्र",                         hi: "क्षेत्रफल",                          en: "Area" },
  "extent":                     { mr: "क्षेत्र",                         hi: "क्षेत्रफल",                          en: "Extent" },
  "assessment_/_judi":          { mr: "आकारणी किंवा जुडी",              hi: "राजस्व / जमाबंदी",                   en: "Assessment / Judi" },
  "assessment":                 { mr: "आकारणी",                          hi: "राजस्व",                              en: "Assessment" },
  "judi":                       { mr: "जुडी",                            hi: "जमाबंदी",                             en: "Judi" },
  "damage_on_inherited_land":   { mr: "दुमाला जमिनीवरील नुकसान",        hi: "विरासती भूमि पर क्षति",              en: "Damage on Inherited Land" },
  "damage":                     { mr: "नुकसान",                          hi: "क्षति",                               en: "Damage" },
  "zp_local_cess":              { mr: "जि.प. स्थानिक उपकर",             hi: "जिला परिषद स्थानीय उपकर",            en: "ZP Local Cess" },
  "gp_local_cess":              { mr: "ग्रा.प. स्थानिक उपकर",           hi: "ग्राम पंचायत स्थानीय उपकर",          en: "GP Local Cess" },
  "grand_total":                { mr: "एकूण",                            hi: "कुल योग",                             en: "Grand Total" },
  "recovery":                   { mr: "वसुलीसाठी",                      hi: "वसूली",                               en: "Recovery" },
  "cess":                       { mr: "उपकर",                            hi: "उपकर",                               en: "Cess" },
  "total":                      { mr: "एकूण",                            hi: "कुल",                                 en: "Total" },
  "khatedar_name":              { mr: "खातेदाराचे नाव",                 hi: "खाताधारक का नाम",                    en: "Khatedar Name" },
  "survey_no":                  { mr: "भूमापन क्रमांक",                 hi: "सर्वे नंबर",                          en: "Survey No." },
  "sub_division":               { mr: "उपविभाग क्रमांक",                hi: "उपखंड नंबर",                          en: "Sub-division No." },
};

const SECTION_TITLE_MAP: Record<string, LangMap> = {
  "header details":            { mr: "शीर्षक तपशील",                  hi: "शीर्षलेख विवरण",                         en: "Header Details" },
  "khatedar (account holder)": { mr: "खातेदार",                       hi: "खाताधारक",                               en: "Khatedar (Account Holder)" },
  "khatedar":                  { mr: "खातेदार",                       hi: "खाताधारक",                               en: "Khatedar" },
  "holdings table":            { mr: "धारण तक्ता",                    hi: "जोत तालिका",                             en: "Holdings Table" },
  "holdings":                  { mr: "धारण",                          hi: "जोत",                                    en: "Holdings" },
  "totals":                    { mr: "एकूण बेरीज",                    hi: "कुल",                                    en: "Totals" },
  "identity":                  { mr: "ओळख",                           hi: "पहचान",                                  en: "Identity" },
  "location":                  { mr: "स्थान",                         hi: "स्थान",                                  en: "Location" },
  "ownership":                 { mr: "मालकी",                         hi: "स्वामित्व",                              en: "Ownership" },
  "area & assessment":         { mr: "क्षेत्र आणि आकारणी",            hi: "क्षेत्र और राजस्व",                      en: "Area & Assessment" },
  "rights & encumbrances":     { mr: "अधिकार आणि बोजा",               hi: "अधिकार और भार",                         en: "Rights & Encumbrances" },
  "mutation":                  { mr: "फेरफार",                        hi: "म्यूटेशन",                               en: "Mutation" },
  "crop":                      { mr: "पीक",                           hi: "फसल",                                    en: "Crop" },
  "address":                   { mr: "पत्ता",                         hi: "पता",                                    en: "Address" },
  "document":                  { mr: "दस्तऐवज",                       hi: "दस्तावेज़",                              en: "Document" },
  "bank & branch":             { mr: "बँक आणि शाखा",                  hi: "बैंक और शाखा",                           en: "Bank & Branch" },
  "account holder":            { mr: "खाते धारक",                     hi: "खाताधारक",                               en: "Account Holder" },
  "account details":           { mr: "खाते तपशील",                    hi: "खाता विवरण",                             en: "Account Details" },
};

const PROFILE_FIELD_LABEL_MAP: Record<string, LangMap> = {
  "name":                { mr: "पूर्ण नाव",                           hi: "पूरा नाम",                               en: "Full Name" },
  "gender":              { mr: "लिंग",                                 hi: "लिंग",                                   en: "Gender" },
  "dob":                 { mr: "जन्मतारीख",                           hi: "जन्म तिथि",                              en: "Date of Birth" },
  "aadhaar":             { mr: "आधार क्रमांक",                        hi: "आधार संख्या",                             en: "Aadhaar Number" },
  "vid":                 { mr: "व्हर्च्युअल आयडी (VID)",               hi: "वर्चुअल आईडी (VID)",                     en: "Virtual ID (VID)" },
  "fathersName":         { mr: "वडील / पती / पालक यांचे नाव",        hi: "पिता / पति / अभिभावक का नाम",           en: "Father's / Husband's / Guardian's Name" },
  "address":             { mr: "पत्ता",                               hi: "पता",                                    en: "Address" },
  "pincode":             { mr: "पिन कोड",                             hi: "पिन कोड",                                en: "PIN Code" },
  "state":               { mr: "राज्य",                               hi: "राज्य",                                  en: "State" },
  "issueDate":           { mr: "जारी दिनांक",                         hi: "जारी तिथि",                              en: "Issue Date" },
  "mobile":              { mr: "मोबाईल क्रमांक",                      hi: "मोबाइल नंबर",                            en: "Mobile Number" },
  "enrolmentNumber":     { mr: "नोंदणी क्रमांक",                      hi: "नामांकन संख्या",                         en: "Enrolment No." },
  "bankName":            { mr: "बँकेचे नाव",                          hi: "बैंक का नाम",                            en: "Bank Name" },
  "branchName":          { mr: "शाखेचे नाव",                          hi: "शाखा का नाम",                            en: "Branch Name" },
  "branchAddress":       { mr: "शाखेचा पत्ता",                        hi: "शाखा का पता",                            en: "Branch Address" },
  "ifsc":                { mr: "IFSC कोड",                            hi: "IFSC कोड",                               en: "IFSC Code" },
  "micrCode":            { mr: "MICR कोड",                            hi: "MICR कोड",                               en: "MICR Code" },
  "bankHolderName":      { mr: "खातेदाराचे नाव",                      hi: "खाताधारक का नाम",                        en: "Account Holder Name" },
  "nomineeRelationship": { mr: "नॉमिनीचे नाते",                       hi: "नामांकित का संबंध",                      en: "Nominee Relationship" },
  "email":               { mr: "ईमेल पत्ता",                          hi: "ईमेल पता",                               en: "Email Address" },
  "bankCustomerAddress": { mr: "ग्राहकाचा पत्ता",                     hi: "ग्राहक का पता",                          en: "Customer Address" },
  "bankAccount":         { mr: "खाते क्रमांक",                        hi: "खाता संख्या",                             en: "Account Number" },
  "accountType":         { mr: "खात्याचा प्रकार",                     hi: "खाते का प्रकार",                         en: "Account Type" },
  "customerIdCif":       { mr: "ग्राहक आयडी (CIF)",                   hi: "ग्राहक आईडी (CIF)",                      en: "Customer ID (CIF)" },
  "accountOpeningDate":  { mr: "खाते उघडण्याची तारीख",                hi: "खाता खोलने की तिथि",                    en: "Account Opening Date" },
  "village":             { mr: "गाव",                                  hi: "गाँव",                                    en: "Village" },
  "taluka":              { mr: "तालुका",                               hi: "तहसील",                                   en: "Taluka" },
  "district":            { mr: "जिल्हा",                               hi: "जिला",                                    en: "District" },
  "surveyNumber":        { mr: "भूमापन क्रमांक",                      hi: "सर्वे नंबर",                              en: "Survey Number" },
  "puId":                { mr: "PU-ID",                                hi: "PU-ID",                                  en: "PU-ID" },
  "khateNumber":         { mr: "खाते क्रमांक",                        hi: "खाता संख्या",                             en: "Khate Number" },
  "occupantClass":       { mr: "भोगवटदार वर्ग",                       hi: "अधिवासी वर्ग",                           en: "Occupant Class" },
  "ownerNames":          { mr: "मालकाचे नाव",                         hi: "स्वामी का नाम",                          en: "Owner Name(s)" },
  "ownerShare":          { mr: "मालकाचा हिस्सा",                      hi: "स्वामी का हिस्सा",                       en: "Owner Share / Hissa" },
  "modeOfAcquisition":   { mr: "संपादनाचा प्रकार",                    hi: "अधिग्रहण का तरीका",                      en: "Mode of Acquisition" },
  "land":                { mr: "एकूण क्षेत्र",                        hi: "कुल क्षेत्रफल",                          en: "Total Area" },
  "landRevenue":         { mr: "जमीन महसूल आकारणी",                   hi: "भू-राजस्व आकलन",                        en: "Land Revenue Assessment" },
  "collectionCharges":   { mr: "वसुली शुल्क",                         hi: "संग्रह शुल्क",                           en: "Collection Charges" },
  "nonCultivatedArea":   { mr: "बिन शेती क्षेत्र",                    hi: "अकृषित क्षेत्र",                         en: "Non-Cultivated Area" },
  "boundaryMarks":       { mr: "सीमा आणि सर्वेक्षण खुणा",             hi: "सीमा और सर्वेक्षण चिह्न",               en: "Boundary & Survey Marks" },
  "lastMutationNumber":        { mr: "शेवटचा फेरफार क्र.",                  hi: "अंतिम म्यूटेशन क्र.",                    en: "Last Mutation No." },
  "previousMutationNumbers":   { mr: "जुने फेरफार क्रमांक",                hi: "पिछले म्यूटेशन क्रमांक",                 en: "Previous Mutation Numbers" },
  "form8aYear":          { mr: "वर्ष",                                 hi: "वर्ष",                                   en: "Year" },
  "form8aReportDate":    { mr: "अहवाल दिनांक",                        hi: "रिपोर्ट दिनांक",                         en: "Report Date" },
  "khateAccountType":    { mr: "खात्याचा प्रकार",                     hi: "खाते का प्रकार",                         en: "Account Type" },

  "khatedarAddress":     { mr: "खातेदाराचा पत्ता",                    hi: "खाताधारक का पता",                        en: "Khatedar Address" },
  "totalAssessment":     { mr: "एकूण आकारणी किंवा जुडी",             hi: "कुल भू-राजस्व / जमाबंदी",               en: "Total Assessment / Judi" },
  "totalDamageInherited":{ mr: "एकूण दुमाला जमिनीवरील नुकसान",       hi: "कुल दुमाला भूमि पर कमी",                en: "Total Damage on Inherited Land" },
  "totalZpCess":         { mr: "एकूण जि.प. स्थानिक उपकर",            hi: "कुल जिला परिषद स्थानीय उपकर",           en: "Total ZP Local Cess" },
  "totalGpCess":         { mr: "एकूण ग्रा.प. स्थानिक उपकर",          hi: "कुल ग्राम पंचायत स्थानीय उपकर",        en: "Total GP Local Cess" },
  "totalRecovery":       { mr: "एकूण वसुलीसाठी",                     hi: "कुल वसूली के लिए",                       en: "Total Recovery Amount" },
  "grandTotal":          { mr: "एकूण",                                 hi: "कुल योग",                                en: "Grand Total" },
  "crop":                { mr: "पिकांचे नाव",                          hi: "फसल का नाम",                             en: "Primary Crop" },
};

const PROFILE_SECTION_DOC_LABELS: Record<string, LangMap> = {
  "identity": { mr: "आधार कार्ड",                     hi: "आधार कार्ड",                          en: "Aadhaar Card" },
  "bank":     { mr: "बँक पासबुक",                     hi: "बैंक पासबुक",                         en: "Bank Passbook" },
  "form7":    { mr: "फॉर्म 7 — अधिकार अभिलेख",        hi: "फॉर्म 7 — स्वामित्व रजिस्टर",         en: "Form 7 — Ownership Register" },
  "form12":   { mr: "फॉर्म 12 — पीक पाहणी",           hi: "फॉर्म 12 — फसल निरीक्षण रजिस्टर",    en: "Form 12 — Crop Inspection Register" },
  "form8a":   { mr: "फॉर्म 8A — धारण नोंदवही",        hi: "फॉर्म 8A — जोत रजिस्टर",             en: "Form 8A — Holding Register" },
};

const UI_T: Record<string, LangMap> = {
  sourceDocTables:   { mr: "स्रोत दस्तऐवज तक्ते",                              hi: "स्रोत दस्तावेज़ तालिकाएं",                        en: "Source Document Tables" },
  table:             { mr: "तक्ता",                                             hi: "तालिका",                                           en: "Table" },
  otherText:         { mr: "दस्तऐवजातील इतर मजकूर",                            hi: "दस्तावेज़ से अन्य पाठ",                            en: "Other Text from Document" },
  fieldsExtracted:   { mr: "माहिती काढली",                                     hi: "फ़ील्ड निकाले",                                     en: "fields extracted" },
  holdingsTitle:     { mr: "धारण जमिनींची नोंदवही",                            hi: "जोत भूमि अभिलेख",                                  en: "Holdings Register" },
  ownershipTitle:    { mr: "मालकी तक्ता",                                       hi: "स्वामित्व तालिका",                                 en: "Ownership Table" },
  clickToEdit:       { mr: "संपादनासाठी कोणत्याही सेलवर क्लिक करा",           hi: "संपादित करने हेतु किसी भी सेल पर क्लिक करें",     en: "click any cell to edit" },
  syncNote:          { mr: "हायलाइट सेल वरील एकूण फील्डशी जोडलेले आहेत",      hi: "हाइलाइट सेल ऊपर के कुल फ़ील्ड के साथ सिंक हैं",  en: "Highlighted cells sync with the Totals fields above" },
  uploadToExtract:   { mr: "माहिती काढण्यासाठी दस्तऐवज अपलोड करा",           hi: "डेटा निकालने के लिए दस्तावेज़ अपलोड करें",        en: "Upload document to extract" },
  filled:            { mr: "भरलेले",                                            hi: "भरे हुए",                                          en: "filled" },
  of:                { mr: "पैकी",                                              hi: "में से",                                           en: "of" },
  verifyEdit:        { mr: "मंजुरीपूर्वी तपासा आणि संपादित करा",              hi: "अनुमोदन से पहले सत्यापित और संपादित करें",        en: "Verify and edit before approving" },
  editable:          { mr: "संपादनयोग्य",                                      hi: "संपादन योग्य",                                     en: "Editable" },
  approvedMsg:       { mr: "शेतकरी प्रोफाइल मंजूर आणि नोंदणीत जतन झाली!",    hi: "किसान प्रोफाइल अनुमोदित और रजिस्ट्री में सहेजी गई!", en: "Farmer profile approved and saved to the Farmer Registry!" },
  backToDocs:        { mr: "दस्तऐवजांवर परत जा",                              hi: "दस्तावेज़ों पर वापस जाएं",                         en: "Back to Documents" },
  approveBtn:        { mr: "मंजूर करा आणि नोंदणीत जतन करा",                  hi: "अनुमोदित करें और रजिस्ट्री में सहेजें",           en: "Approve & Save to Farmer Registry" },
  // DocUploadCard strings
  extracted:         { mr: "माहिती काढली",                                     hi: "डेटा निकाला",                                      en: "Extracted" },
  uploading:         { mr: "अपलोड होत आहे…",                                   hi: "अपलोड हो रहा है…",                                 en: "Uploading…" },
  processing:        { mr: "प्रक्रिया होत आहे…",                               hi: "प्रक्रिया हो रही है…",                              en: "Processing…" },
  failed:            { mr: "अयशस्वी",                                          hi: "विफल",                                             en: "Failed" },
  upload:            { mr: "अपलोड करा",                                        hi: "अपलोड करें",                                       en: "Upload" },
  reupload:          { mr: "पुन्हा अपलोड करा",                                 hi: "पुनः अपलोड करें",                                  en: "Re-upload" },
  dropUpload:        { mr: "PDF / प्रतिमा अपलोड करण्यासाठी ड्रॅग करा किंवा येथे क्लिक करा", hi: "PDF / छवि अपलोड करने के लिए खींचें या यहाँ क्लिक करें", en: "Drag & drop or click to upload PDF / image" },
  reviewNext:        { mr: "पुढील टप्प्यात तपासा",                            hi: "अगले चरण में समीक्षा करें",                        en: "Review in next step" },
  tables:            { mr: "तक्ते",                                            hi: "तालिकाएं",                                         en: "tables" },
  // DocReviewPanel strings
  docNo:             { mr: "दस्तऐवज",                                          hi: "दस्तावेज़",                                        en: "Document" },
  photoExtracted:    { mr: "प्रोफाइल फोटो काढला",                              hi: "प्रोफाइल फोटो निकाला",                             en: "Profile Photo Extracted" },
  photoFrom:         { mr: "आधार कार्डातून स्वयंचलितपणे काढला",               hi: "आधार कार्ड से स्वतः निकाला गया",                  en: "Automatically extracted from Aadhaar Card" },
  previous:          { mr: "मागील",                                            hi: "पिछला",                                            en: "Previous" },
  nextDoc:           { mr: "पुढील दस्तऐवज",                                   hi: "अगला दस्तावेज़",                                   en: "Next Document" },
  reviewProfile:     { mr: "प्रोफाइल तपासा",                                  hi: "प्रोफाइल समीक्षा करें",                            en: "Review Profile" },
  // ReviewTabBar / NewRegistration strings
  uploadTab:         { mr: "अपलोड",                                            hi: "अपलोड",                                            en: "Upload" },
  farmerProfileTab:  { mr: "शेतकरी प्रोफाइल",                                 hi: "किसान प्रोफाइल",                                   en: "Farmer Profile" },
  newRegTitle:       { mr: "नवीन नोंदणी",                                     hi: "नई पंजीकरण",                                       en: "New Registration" },
  waitingProcessing: { mr: "प्रक्रियेची प्रतीक्षा…",                          hi: "प्रक्रिया की प्रतीक्षा…",                          en: "waiting for processing…" },
  newRegDesc:        { mr: "खालील एक किंवा अधिक दस्तऐवज अपलोड करा. कोणतेही दस्तऐवज अनिवार्य नाही. किमान एक दस्तऐवज प्रक्रिया झाल्यावर पुढे जा बटण सक्रिय होईल.", hi: "नीचे एक या अधिक दस्तावेज़ अपलोड करें। कोई भी दस्तावेज़ अनिवार्य नहीं है। कम से कम एक दस्तावेज़ संसाधित होने पर आगे बढ़ें बटन सक्रिय होगा।", en: "Upload one or more documents below. You can upload any combination — no documents are mandatory. Once at least one document is processed, the Proceed button will activate." },
  proceedReview:     { mr: "पुनरावलोकनासाठी पुढे जा",                        hi: "समीक्षा के लिए आगे बढ़ें",                          en: "Proceed to Review" },
  docsReady:         { mr: "दस्तऐवज तपासणीसाठी तयार",                        hi: "दस्तावेज़ समीक्षा के लिए तैयार",                   en: "document(s) ready to review" },
  waitingProcess:    { mr: "प्रक्रियेची प्रतीक्षा…",                          hi: "प्रक्रिया की प्रतीक्षा…",                          en: "waiting for processing…" },
  processingDocs:    { mr: "दस्तऐवज प्रक्रिया होत आहे…",                     hi: "दस्तावेज़ प्रक्रिया हो रही है…",                   en: "Processing documents…" },
  uploadFirst:       { mr: "पुढे जाण्यासाठी किमान एक दस्तऐवज अपलोड करा",     hi: "आगे बढ़ने के लिए कम से कम एक दस्तावेज़ अपलोड करें", en: "Upload at least one document to proceed" },
};

function ui(key: keyof typeof UI_T, lang: LangCode): string {
  return UI_T[key]?.[lang] ?? String(key);
}

function tSec(title: string, lang: LangCode): string {
  const key = title.toLowerCase().trim();
  for (const [mapKey, t] of Object.entries(SECTION_TITLE_MAP)) {
    if (key === mapKey || key.startsWith(mapKey) || mapKey.startsWith(key)) return t[lang];
  }
  return title;
}

function normFieldKey(s: string): string {
  return s
    .replace(/\(.*?\)/g, " ")           // strip (parenthetical groups)
    .replace(/[^\x00-\x7F]+/g, " ")     // strip non-ASCII (Devanagari)
    .toLowerCase()
    .replace(/[\/\\.\-]+/g, " ")        // slashes, dots, dashes → space
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function tField(fieldKey: string, lang: LangCode, fallback: string): string {
  const norm = normFieldKey(fieldKey);
  // 1. Exact match
  if (FIELD_LABEL_MAP[norm]) return FIELD_LABEL_MAP[norm][lang];
  // 2. Prefix / suffix match
  for (const [mapKey, t] of Object.entries(FIELD_LABEL_MAP)) {
    if (norm === mapKey || norm.startsWith(mapKey + "_") || mapKey.startsWith(norm + "_")) return t[lang];
  }
  // 3. Substring match (all meaningful words in norm appear in mapKey)
  const words = norm.split("_").filter(w => w.length > 2);
  if (words.length > 0) {
    for (const [mapKey, t] of Object.entries(FIELD_LABEL_MAP)) {
      if (words.every(w => mapKey.includes(w))) return t[lang];
    }
  }
  return fallback;
}

/**
 * Domain-specific phrase map for Maharashtra land-record terms.
 * Keys are canonical Marathi phrases. Values provide Hindi and English equivalents.
 * Sorted longest-first at runtime so longer phrases are matched before sub-phrases.
 */
const TERM_MAP: Record<string, { en: string; hi: string }> = {
  // Account types
  "अविभक्त कुटुम्ब खाते":          { en: "Joint Family Account",              hi: "अविभाजित परिवार खाता" },
  "अविभक्त कुटूम्ब खाते":          { en: "Joint Family Account",              hi: "अविभाजित परिवार खाता" },
  "अविभक्त कुटुंब खाते":           { en: "Joint Family Account",              hi: "अविभाजित परिवार खाता" },
  "वैयक्तिक खाते":                  { en: "Individual Account",                hi: "व्यक्तिगत खाता" },
  "संस्था खाते":                    { en: "Institution Account",               hi: "संस्था खाता" },
  "सरकारी खाते":                    { en: "Government Account",                hi: "सरकारी खाता" },
  // Yes / No
  "होय":                             { en: "Yes",                               hi: "हाँ" },
  "नाही":                            { en: "No",                                hi: "नहीं" },
  // Land / cultivation types
  "बागायत":                          { en: "Irrigated",                         hi: "सिंचित" },
  "जिरायत":                          { en: "Rainfed",                           hi: "वर्षाधारित" },
  "कोरडवाहू":                        { en: "Dryland",                           hi: "असिंचित" },
  "लागवड योग्य":                     { en: "Cultivable",                        hi: "कृषि योग्य" },
  "लागवड":                           { en: "Cultivation",                       hi: "खेती" },
  "पडीत जमीन":                       { en: "Fallow Land",                       hi: "परती भूमि" },
  "पडीत":                            { en: "Fallow",                            hi: "परती" },
  "वन जमीन":                         { en: "Forest Land",                       hi: "वन भूमि" },
  // Rights / holders
  "इतर हक्क":                        { en: "Other Rights",                      hi: "अन्य अधिकार" },
  "कब्जेदार":                        { en: "Occupant",                          hi: "काबिज़दार" },
  "भाडेकरू":                         { en: "Tenant",                            hi: "किराएदार" },
  "वारस":                            { en: "Heir",                              hi: "उत्तराधिकारी" },
  "खातेदार":                         { en: "Account Holder",                    hi: "खाताधारक" },
  // Notice / instructions
  "सुचना":                           { en: "Notice",                            hi: "सूचना" },
  "सूचना":                           { en: "Notice",                            hi: "सूचना" },
  "शेरा":                            { en: "Remarks",                           hi: "टिप्पणी" },
  // Totals / amounts
  "एकूण रक्कम":                      { en: "Total Amount",                      hi: "कुल राशि" },
  "एकूण क्षेत्र":                    { en: "Total Area",                        hi: "कुल क्षेत्र" },
  "एकूण":                            { en: "Total",                             hi: "कुल" },
  "रक्कम":                           { en: "Amount",                            hi: "राशि" },
  // Geography
  "गाव":                             { en: "Village",                           hi: "गाँव" },
  "तालुका":                          { en: "Taluka",                            hi: "तालुका" },
  "जिल्हा":                          { en: "District",                          hi: "जिला" },
  // Seasons / crops
  "खरीप":                            { en: "Kharif",                            hi: "खरीफ" },
  "रब्बी":                           { en: "Rabi",                              hi: "रबी" },
  "उन्हाळी":                         { en: "Summer",                            hi: "गर्मी" },
  // Common crop names
  "गहू":                             { en: "Wheat",                             hi: "गेहूँ" },
  "ज्वारी":                          { en: "Sorghum",                           hi: "ज्वार" },
  "बाजरी":                           { en: "Pearl Millet",                      hi: "बाजरा" },
  "कापूस":                           { en: "Cotton",                            hi: "कपास" },
  "सोयाबीन":                         { en: "Soybean",                           hi: "सोयाबीन" },
  "ऊस":                              { en: "Sugarcane",                         hi: "गन्ना" },
  "द्राक्षे":                        { en: "Grapes",                            hi: "अंगूर" },
  "डाळिंब":                          { en: "Pomegranate",                       hi: "अनार" },
  // Status
  "प्रलंबित":                        { en: "Pending",                           hi: "लंबित" },
  "मंजूर":                           { en: "Approved",                          hi: "स्वीकृत" },
  "नामंजूर":                         { en: "Rejected",                          hi: "अस्वीकृत" },
  // Directions
  "उत्तर":                           { en: "North",                             hi: "उत्तर" },
  "दक्षिण":                          { en: "South",                             hi: "दक्षिण" },
  "पूर्व":                           { en: "East",                              hi: "पूर्व" },
  "पश्चिम":                          { en: "West",                              hi: "पश्चिम" },
};

const _SORTED_TERMS = Object.keys(TERM_MAP).sort((a, b) => b.length - a.length);

/**
 * English values returned by OCR → Marathi / Hindi equivalents.
 * Keys are matched case-insensitively.
 */
const ENG_VALUE_MAP: Record<string, { mr: string; hi: string }> = {
  // Gender
  "male":               { mr: "पुरुष",         hi: "पुरुष" },
  "female":             { mr: "महिला",          hi: "महिला" },
  "transgender":        { mr: "तृतीयपंथी",      hi: "तृतीय लिंग" },
  // States (common)
  "maharashtra":        { mr: "महाराष्ट्र",     hi: "महाराष्ट्र" },
  "gujarat":            { mr: "गुजरात",         hi: "गुजरात" },
  "karnataka":          { mr: "कर्नाटक",        hi: "कर्नाटक" },
  "madhya pradesh":     { mr: "मध्य प्रदेश",    hi: "मध्य प्रदेश" },
  "uttar pradesh":      { mr: "उत्तर प्रदेश",   hi: "उत्तर प्रदेश" },
  "rajasthan":          { mr: "राजस्थान",       hi: "राजस्थान" },
  "goa":                { mr: "गोवा",           hi: "गोवा" },
  // Boolean
  "yes":                { mr: "होय",            hi: "हाँ" },
  "no":                 { mr: "नाही",           hi: "नहीं" },
  // Account types
  "savings":            { mr: "बचत",            hi: "बचत" },
  "current":            { mr: "चालू",           hi: "चालू" },
};

function translateValue(value: string, lang: LangCode): string {
  if (!value) return value;
  const trimmed = value.trim();

  // 0. English common values → Marathi / Hindi
  if (lang !== "en") {
    const engEntry = ENG_VALUE_MAP[trimmed.toLowerCase()];
    if (engEntry) return engEntry[lang];
  }

  // 1. Exact-match lookup (whole value is a known Marathi term)
  if (TERM_MAP[trimmed]) {
    const entry = TERM_MAP[trimmed];
    const translated = lang === "en" ? entry.en : lang === "hi" ? entry.hi : trimmed;
    return value.replace(trimmed, translated);
  }

  let result = value;

  // 2. Arabic → Devanagari digits for mr / hi
  if (lang !== "en") {
    const d = ["०","१","२","३","४","५","६","७","८","९"];
    result = result.replace(/[0-9]/g, (ch) => d[parseInt(ch)]);
  }

  // 3. Phrase-level replacement for hi / en (mr keeps original Marathi)
  if (lang !== "mr") {
    for (const term of _SORTED_TERMS) {
      if (result.includes(term)) {
        const entry = TERM_MAP[term];
        const rep = lang === "en" ? entry.en : entry.hi;
        result = result.split(term).join(rep);
      }
    }
  }

  return result;
}

/** Apply digit-localisation AND phrase translation to HTML text nodes (not attributes). */
function localizeHtml(html: string, lang: LangCode): string {
  if (!html) return html;
  const doDigits = lang !== "en";
  const doTerms = lang !== "mr";
  if (!doDigits && !doTerms) return html;

  const d = ["०","१","२","३","४","५","६","७","८","९"];

  return html.replace(/>([^<]*)</g, (_m, text: string) => {
    let t = text;
    if (doDigits) t = t.replace(/[0-9]/g, (ch) => d[parseInt(ch)]);
    if (doTerms) {
      for (const term of _SORTED_TERMS) {
        if (t.includes(term)) {
          const entry = TERM_MAP[term];
          const rep = lang === "en" ? entry.en : entry.hi;
          t = t.split(term).join(rep);
        }
      }
    }
    return ">" + t + "<";
  });
}

function tProfileField(fieldKey: string, lang: LangCode): string {
  return PROFILE_FIELD_LABEL_MAP[fieldKey]?.[lang] ?? fieldKey;
}

export type DocTypeId = "form7" | "form12" | "form8a" | "aadhar" | "bank_passbook";
type ExtractionStatus = "idle" | "uploading" | "processing" | "complete" | "error";
type WorkflowStep = "upload" | "review";

interface DocCard {
  id: DocTypeId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const DOC_CARD_LABELS: Record<string, LangMap> = {
  "form7":         { mr: "फॉर्म ७ (अधिकार अभिलेख)",     hi: "फॉर्म ७ (स्वामित्व रजिस्टर)",     en: "Form 7 (Ownership Register)" },
  "form12":        { mr: "फॉर्म १२ (पीक पाहणी)",         hi: "फॉर्म १२ (फसल निरीक्षण रजिस्टर)", en: "Form 12 (Crop Inspection Register)" },
  "form8a":        { mr: "फॉर्म ८A (धारण नोंदवही)",      hi: "फॉर्म ८A (जोत रजिस्टर)",          en: "Form 8A (Holding Register)" },
  "aadhar":        { mr: "आधार कार्ड",                   hi: "आधार कार्ड",                       en: "Aadhaar Card" },
  "bank_passbook": { mr: "बँक पासबुक",                   hi: "बैंक पासबुक",                      en: "Bank Passbook" },
};

const DOC_CARD_DESCS: Record<string, LangMap> = {
  "form7":         { mr: "महाराष्ट्र ७/१२ — अधिकार अभिलेख",           hi: "महाराष्ट्र ७/१२ — स्वामित्व रजिस्टर",           en: "Maharashtra 7/12 — Rights Register" },
  "form12":        { mr: "महाराष्ट्र ७/१२ — पीक पाहणी",               hi: "महाराष्ट्र ७/१२ — फसल निरीक्षण रजिस्टर",       en: "Maharashtra 7/12 — Crop Inspection Register" },
  "form8a":        { mr: "महाराष्ट्र — धारण जमिनींची नोंदवही",         hi: "महाराष्ट्र — जोत भूमि अभिलेख",                  en: "Maharashtra — Holding Register" },
  "aadhar":        { mr: "UIDAI आधार ओळखपत्र",                         hi: "UIDAI आधार पहचान पत्र",                          en: "UIDAI Aadhaar identity card" },
  "bank_passbook": { mr: "बँक खाते पासबुक पहिले पान",                  hi: "बैंक खाता पासबुक का पहला पृष्ठ",                en: "Bank account passbook front page" },
};

export const DOC_CARD_SHORT: Record<string, LangMap> = {
  "form7":         { mr: "फॉर्म ७",  hi: "फॉर्म ७",  en: "Form 7" },
  "form12":        { mr: "फॉर्म १२", hi: "फॉर्म १२", en: "Form 12" },
  "form8a":        { mr: "फॉर्म ८A", hi: "फॉर्म ८A", en: "Form 8A" },
  "aadhar":        { mr: "आधार",     hi: "आधार",      en: "Aadhaar" },
  "bank_passbook": { mr: "पासबुक",   hi: "पासबुक",    en: "Passbook" },
};

export const DOC_CARDS: DocCard[] = [
  {
    id: "form7",
    label: "Form 7 (Ownership Register)",
    shortLabel: "Form 7",
    description: "Maharashtra 7/12 — अधिकार अभिलेख (Rights Register)",
    icon: FileStack,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "form12",
    label: "Form 12 (Crop Inspection Register)",
    shortLabel: "Form 12",
    description: "Maharashtra 7/12 — पीक पाहणी (Crop Inspection Register)",
    icon: Sprout,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    id: "form8a",
    label: "Form 8A (Holding Register)",
    shortLabel: "Form 8A",
    description: "Maharashtra — धारण जमिनींची नोंदवही (Holding Register)",
    icon: ClipboardCheck,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
  {
    id: "aadhar",
    label: "Aadhaar Card",
    shortLabel: "Aadhaar",
    description: "UIDAI Aadhaar identity card",
    icon: User,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "bank_passbook",
    label: "Bank Passbook",
    shortLabel: "Passbook",
    description: "Bank account passbook front page",
    icon: Landmark,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
];

interface FieldRow {
  key: string;
  label: string;
  value: string;
}

interface TableData {
  key: string;
  label: string;
  columns: { key: string; label: string }[];
  rows: { values: Record<string, string> }[];
}

export interface RawTable {
  blockId?: string;
  headers: string[];
  rows: string[][];
  html: string;
}

export interface SectionData {
  title: string;
  fields: FieldRow[];
  tables: TableData[];
}

export interface ExtractionState {
  status: ExtractionStatus;
  filename: string;
  requestId: string | null;
  sections: SectionData[];
  images: Record<string, string> | null;
  rawTables: RawTable[];
  textBlocks: string[];
  aadharPhoto: { base64: string; mimeType: string } | null;
  error: string | null;
  /** Data URL of the raw uploaded file (captured locally before upload) */
  rawFileDataUrl?: string | null;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.12;

/** Full-screen document lightbox — scroll to zoom, drag to pan, Esc to close */
export function DocLightbox({ src, label, onClose }: { src: string; label?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  // Keep scaleRef in sync so the native wheel handler can read latest value
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Lock body scroll and wire up native wheel listener (passive: false required for preventDefault)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setScale(s => {
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s + delta));
        scaleRef.current = next;
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.body.style.overflow = prev;
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Keyboard: Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scaleRef.current <= 1) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTranslate({
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => { dragging.current = false; };

  const pct = Math.round(scale * 100);

  return createPortal(
    <div className="fixed inset-0 flex flex-col bg-black/96" style={{ zIndex: 10001 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/70 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-white/50 flex-shrink-0" />
          {label && <span className="text-sm font-semibold text-white/80">{label}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 hidden sm:block">Scroll to zoom · drag to pan · Esc to close</span>
          <span className="text-xs font-mono text-white/50 tabular-nums w-12 text-center">{pct}%</span>
          <button
            onClick={() => setScale(s => Math.min(ZOOM_MAX, s + ZOOM_STEP * 3))}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-white/10 border border-white/20"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => { if (scale > 1) { setScale(s => Math.max(ZOOM_MIN, s - ZOOM_STEP * 3)); } else resetZoom(); }}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-white/10 border border-white/20"
            title="Zoom out"
          >
            <ZoomIn className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={resetZoom}
            className="text-xs text-white/60 hover:text-white font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-white/10 border border-white/20"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-semibold transition-colors px-4 py-2 rounded-lg hover:bg-white/10 border border-white/20"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={e => { if (!dragging.current && scale === 1) onClose(); }}
        style={{ cursor: scale > 1 ? (dragging.current ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={src}
          alt={label ?? "Document"}
          draggable={false}
          className="rounded-xl shadow-2xl select-none"
          style={{
            maxWidth: "none",
            maxHeight: "none",
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transformOrigin: "center center",
            transition: dragging.current ? "none" : "transform 0.05s ease-out",
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

export const DEFAULT_STATE: ExtractionState = {
  status: "idle",
  filename: "",
  requestId: null,
  sections: [],
  images: null,
  rawTables: [],
  textBlocks: [],
  aadharPhoto: null,
  error: null,
  rawFileDataUrl: null,
};

export interface FarmerProfile {
  name: string;
  aadhaar: string;
  vid: string;
  dob: string;
  gender: string;
  fathersName: string;
  mobile: string;
  address: string;
  pincode: string;
  state: string;
  issueDate: string;
  enrolmentNumber: string;
  village: string;
  district: string;
  taluka: string;
  surveyNumber: string;
  puId: string;
  khateNumber: string;
  occupantClass: string;
  ownerNames: string;
  ownerShare: string;
  modeOfAcquisition: string;
  land: string;
  landRevenue: string;
  collectionCharges: string;

  nonCultivatedArea: string;



  boundaryMarks: string;
  lastMutationNumber: string;


  previousMutationNumbers: string;
  form8aYear: string;
  form8aReportDate: string;
  khateAccountType: string;

  khatedarAddress: string;
  totalAssessment: string;
  totalDamageInherited: string;
  totalZpCess: string;
  totalGpCess: string;
  totalRecovery: string;
  grandTotal: string;
  crop: string;
  bankName: string;
  branchName: string;
  branchAddress: string;
  ifsc: string;
  micrCode: string;
  bankAccount: string;
  accountType: string;
  accountOpeningDate: string;
  customerIdCif: string;
  nomineeRelationship: string;
  bankHolderName: string;
  bankCustomerAddress: string;
  email: string;
}

export const EMPTY_PROFILE: FarmerProfile = {
  name: "", aadhaar: "", vid: "", dob: "", gender: "", fathersName: "",
  mobile: "", address: "", pincode: "", state: "", issueDate: "", enrolmentNumber: "",
  village: "", district: "", taluka: "", surveyNumber: "", puId: "",
  khateNumber: "", occupantClass: "", ownerNames: "", ownerShare: "", modeOfAcquisition: "",
  land: "", landRevenue: "", collectionCharges: "", nonCultivatedArea: "",
  boundaryMarks: "",
  lastMutationNumber: "", previousMutationNumbers: "",
  form8aYear: "", form8aReportDate: "", khateAccountType: "",
  khatedarAddress: "", totalAssessment: "", totalDamageInherited: "",
  totalZpCess: "", totalGpCess: "", totalRecovery: "", grandTotal: "", crop: "",
  bankName: "", branchName: "", branchAddress: "", ifsc: "", micrCode: "",
  bankAccount: "", accountType: "", accountOpeningDate: "", customerIdCif: "",
  nomineeRelationship: "", bankHolderName: "", bankCustomerAddress: "", email: "",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntilDone(
  requestId: string,
  onComplete: (result: Omit<ExtractionState, "filename">) => void,
  onError: (msg: string) => void,
) {
  // No cap — accurate mode can take several minutes; keep polling until done.
  while (true) {
    await sleep(5000);
    const pollUrl = `${BASE_URL}/api/extract/${requestId}`;
    try {
      const res = await fetch(pollUrl);
      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        onError("API server is unavailable. Please try again in a moment.");
        return;
      }
      if (!res.ok) {
        onError((data?.error as string) ?? `Server error ${res.status}`);
        return;
      }
      if (data.status === "processing") continue;
      if (data.status === "error") {
        onError((data.error as string) ?? "Extraction failed.");
        return;
      }
      if (data.status === "complete") {
        const markerData = data.marker as Record<string, unknown> | null | undefined;
        const markerImages: Record<string, string> | null =
          (markerData?.images as Record<string, string>) ?? null;
        const aadharPhoto: { base64: string; mimeType: string } | null =
          (data.aadhar_photo as { base64: string; mimeType: string }) ?? null;
        const structuredData = data.structured as Record<string, unknown> | null | undefined;
        onComplete({
          status: "complete",
          requestId,
          sections: (structuredData?.sections as SectionData[]) ?? [],
          images: markerImages,
          rawTables: (data.raw_tables as RawTable[]) ?? [],
          textBlocks: (data.text_blocks as string[]) ?? [],
          aadharPhoto,
          error: null,
        });
        return;
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Network error");
      return;
    }
  }
  onError("Timed out waiting for extraction result.");
}

function fieldMatch(field: FieldRow, keywords: string[]): boolean {
  const h = `${field.key} ${field.label}`.toLowerCase();
  return keywords.some((kw) => h.includes(kw));
}

export function extractProfileFromStates(
  allStates: Record<DocTypeId, ExtractionState>,
): Partial<FarmerProfile> {
  const out: Partial<FarmerProfile> = {};

  const pick = (keywords: string[], field: keyof FarmerProfile, docTypes: DocTypeId[]) => {
    if (out[field]) return;
    for (const docId of docTypes) {
      const state = allStates[docId];
      if (state.status !== "complete") continue;
      for (const sec of state.sections) {
        for (const f of sec.fields) {
          if (f.value && f.value !== "—" && fieldMatch(f, keywords)) {
            out[field] = f.value;
            return;
          }
        }
      }
    }
  };

  pick(["full_name", "name"], "name", ["aadhar"]);
  pick(["aadhaar_number", "aadhaar", "uid", "uidai"], "aadhaar", ["aadhar"]);
  pick(["vid", "virtual_id"], "vid", ["aadhar"]);
  pick(["date_of_birth", "dob"], "dob", ["aadhar"]);
  pick(["gender"], "gender", ["aadhar"]);
  pick(["father", "husband", "guardian", "care_of"], "fathersName", ["aadhar"]);
  pick(["mobile_number", "mobile"], "mobile", ["aadhar"]);
  pick(["address"], "address", ["aadhar"]);
  pick(["pincode", "pin_code", "pin code", "postal"], "pincode", ["aadhar"]);
  pick(["state"], "state", ["aadhar"]);
  pick(["issue_date"], "issueDate", ["aadhar"]);
  pick(["enrolment_number", "enrolment_no"], "enrolmentNumber", ["aadhar"]);
  pick(["bank_name"], "bankName", ["bank_passbook"]);
  pick(["branch_name"], "branchName", ["bank_passbook"]);
  pick(["branch_address"], "branchAddress", ["bank_passbook"]);
  pick(["ifsc_code", "ifsc"], "ifsc", ["bank_passbook"]);
  pick(["micr_code", "micr"], "micrCode", ["bank_passbook"]);
  pick(["account_holder_name"], "bankHolderName", ["bank_passbook"]);
  pick(["customer address", "customer_address"], "bankCustomerAddress", ["bank_passbook"]);
  pick(["account_number"], "bankAccount", ["bank_passbook"]);
  pick(["account_type"], "accountType", ["bank_passbook"]);
  pick(["opening_date"], "accountOpeningDate", ["bank_passbook"]);
  pick(["customer_id"], "customerIdCif", ["bank_passbook"]);
  pick(["nominee_relationship"], "nomineeRelationship", ["bank_passbook"]);
  pick(["email"], "email", ["bank_passbook"]);
  pick(["village"], "village", ["form7", "form8a", "form12"]);
  pick(["taluka"], "taluka", ["form7", "form8a", "form12"]);
  pick(["district"], "district", ["form7", "form8a", "form12"]);
  pick(["survey_number"], "surveyNumber", ["form7", "form12"]);
  pick(["pu_id"], "puId", ["form7"]);
  pick(["khate_number", "khate number"], "khateNumber", ["form7", "form8a", "form12"]);
  pick(["occupant_class"], "occupantClass", ["form7"]);
  pick(["owner_names", "owner name"], "ownerNames", ["form7"]);
  pick(["owner_share"], "ownerShare", ["form7"]);
  pick(["mode_of_acquisition"], "modeOfAcquisition", ["form7"]);
  pick(["total_area"], "land", ["form7", "form8a"]);
  pick(["land_revenue_assessment"], "landRevenue", ["form7"]);
  pick(["collection_charges"], "collectionCharges", ["form7"]);

  pick(["non_cultivated_area"], "nonCultivatedArea", ["form7"]);



  pick(["boundary_and_survey_marks"], "boundaryMarks", ["form7"]);
  pick(["last_mutation_number"], "lastMutationNumber", ["form7"]);


  pick(["old_mutation_numbers", "previous mutation"], "previousMutationNumbers", ["form7"]);
  pick(["year"], "form8aYear", ["form8a"]);
  pick(["report_date"], "form8aReportDate", ["form8a"]);
  pick(["account_type", "khata type", "account type"], "khateAccountType", ["form8a"]);

  pick(["khatedar_address"], "khatedarAddress", ["form8a"]);
  pick(["total_assessment_or_judi", "total assessment"], "totalAssessment", ["form8a"]);
  pick(["total_damage_on_inherited_land", "total damage"], "totalDamageInherited", ["form8a"]);
  pick(["total_zp_local_cess", "zp local cess"], "totalZpCess", ["form8a"]);
  pick(["total_gp_local_cess", "gp local cess"], "totalGpCess", ["form8a"]);
  pick(["total_recovery_amount", "total recovery"], "totalRecovery", ["form8a"]);
  pick(["grand_total"], "grandTotal", ["form8a"]);
  pick(["crop_name", "crop"], "crop", ["form12"]);

  return out;
}

/**
 * Strip Devanagari administrative annotations that appear after survey numbers
 * in raw document HTML (e.g. "77/3 भूमिअभिलेख निर्णयात्" → "77/3").
 */
function cleanDocHtml(html: string): string {
  return html.replace(
    /(\d+(?:\/[\dA-Za-z]+)*)\s+[\u0900-\u097F][\u0900-\u097F\u0020\u00A0।,.-]*/g,
    (_match, surveyNum: string) => surveyNum,
  );
}

function isSectionAnchorLabel(text: string): boolean {
  return /^\s*[\u0900-\u097F]\s*\)/.test(text ?? "");
}

function splitLabelValue(line: string): { label: string; value: string | null } {
  const trimmed = (line ?? "").trim();
  if (!trimmed) return { label: "", value: null };
  const lastSpace = trimmed.search(/\s+\S+$/);
  if (lastSpace < 0) return { label: trimmed, value: null };
  const label = trimmed.slice(0, lastSpace).trim();
  const value = trimmed.slice(lastSpace).trim();
  if (!label) return { label: trimmed, value: null };
  if (/^[\u0966-\u096F0-9.,/\-()]+$/.test(value)) return { label, value };
  return { label: trimmed, value: null };
}

export function SpannedTable({ headers, rows, lang = "mr" }: { headers: string[]; rows: string[][]; lang?: LangCode }) {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  type Cell = { value: string; rowspan: number };
  const grid: (Cell | null)[][] = rows.map((r) => {
    const padded: (Cell | null)[] = r.map((c) => ({ value: c ?? "", rowspan: 1 }));
    while (padded.length < colCount) padded.push({ value: "", rowspan: 1 });
    return padded;
  });
  for (let c = 0; c < colCount; c++) {
    let anchorRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const cell = grid[r][c];
      if (cell === null) continue;
      const isEmpty = !cell.value || cell.value.trim() === "";
      if (!isEmpty) { anchorRow = r; }
      else if (anchorRow >= 0) {
        const anchor = grid[anchorRow][c];
        if (anchor) anchor.rowspan += 1;
        grid[r][c] = null;
      }
    }
  }
  if (colCount > 0) {
    let sectionAnchorRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const cell = grid[r][0];
      if (cell === null) continue;
      if (isSectionAnchorLabel(cell.value)) {
        sectionAnchorRow = r;
      } else if (sectionAnchorRow >= 0) {
        const anchor = grid[sectionAnchorRow][0];
        if (anchor) {
          const sub = (cell.value ?? "").trim();
          if (sub.length > 0) anchor.value = anchor.value ? `${anchor.value}\n${sub}` : sub;
          anchor.rowspan += 1;
        }
        grid[r][0] = null;
      }
    }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border text-xs">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-muted/40">
              {headers.map((h, i) => (
                <th key={i} className="border border-border p-2 text-left font-semibold align-top whitespace-pre-wrap">{tField(h, lang, h) || ""}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {grid.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => {
                if (cell === null) return null;
                const hasContent = cell.value !== undefined && cell.value !== null && cell.value.length > 0;
                const lines = (cell.value ?? "").split("\n");
                return (
                  <td key={cIdx} rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined} className="border border-border px-2 py-1.5 align-top break-words">
                    {hasContent ? (
                      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 leading-relaxed">
                        {lines.flatMap((line, lIdx) => {
                          const { label, value } = splitLabelValue(line);
                          if (value === null) return [<div key={`${lIdx}-full`} className="col-span-2 whitespace-pre-wrap">{label.length > 0 ? label : "\u00A0"}</div>];
                          return [
                            <div key={`${lIdx}-label`} className="whitespace-pre-wrap">{translateValue(label, lang)}</div>,
                            <div key={`${lIdx}-value`} className="whitespace-pre-wrap text-right tabular-nums">{value}</div>,
                          ];
                        })}
                      </div>
                    ) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableSpannedTable({
  headers,
  rows,
  lang = "mr",
}: {
  headers: string[];
  rows: string[][];
  lang?: LangCode;
}) {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  type Cell = { value: string; rowspan: number };
  const grid: (Cell | null)[][] = rows.map((r) => {
    const padded: (Cell | null)[] = r.map((c) => ({ value: c ?? "", rowspan: 1 }));
    while (padded.length < colCount) padded.push({ value: "", rowspan: 1 });
    return padded;
  });
  for (let c = 0; c < colCount; c++) {
    let anchorRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const cell = grid[r][c];
      if (cell === null) continue;
      const isEmpty = !cell.value || cell.value.trim() === "";
      if (!isEmpty) { anchorRow = r; }
      else if (anchorRow >= 0) {
        const anchor = grid[anchorRow][c];
        if (anchor) anchor.rowspan += 1;
        grid[r][c] = null;
      }
    }
  }
  if (colCount > 0) {
    let sectionAnchorRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const cell = grid[r][0];
      if (cell === null) continue;
      if (isSectionAnchorLabel(cell.value)) {
        sectionAnchorRow = r;
      } else if (sectionAnchorRow >= 0) {
        const anchor = grid[sectionAnchorRow][0];
        if (anchor) {
          const sub = (cell.value ?? "").trim();
          if (sub.length > 0) anchor.value = anchor.value ? `${anchor.value}\n${sub}` : sub;
          anchor.rowspan += 1;
        }
        grid[r][0] = null;
      }
    }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border text-xs">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-muted/40">
              {headers.map((h, i) => (
                <th key={i} className="border border-border p-2 text-left font-semibold align-top whitespace-pre-wrap">
                  {tField(h, lang, h) || ""}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {grid.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => {
                if (cell === null) return null;
                const lines = (cell.value ?? "").split("\n");
                const hasContent = lines.some(l => l.trim().length > 0);
                return (
                  <td
                    key={cIdx}
                    rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    className="border border-border px-2 py-1.5 align-top break-words focus:bg-primary/5 focus:outline-none cursor-text min-w-[40px]"
                    dangerouslySetInnerHTML={{
                      __html: hasContent
                        ? `<div style="display:grid;grid-template-columns:1fr auto;column-gap:0.75rem;row-gap:0.25rem;line-height:1.625;">${
                            lines.flatMap((line) => {
                              const { label, value } = splitLabelValue(line);
                              if (value === null) {
                                return [`<div style="grid-column:1/-1;white-space:pre-wrap;">${label.length > 0 ? label : "\u00A0"}</div>`];
                              }
                              return [
                                `<div style="white-space:pre-wrap;">${label}</div>`,
                                `<div style="white-space:pre-wrap;text-align:right;font-variant-numeric:tabular-nums;">${value}</div>`,
                              ];
                            }).join("")
                          }</div>`
                        : ""
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FieldsTable({
  sections,
  rawTables = [],
  textBlocks = [],
  docId,
  lang = "mr",
}: {
  sections: SectionData[];
  rawTables?: RawTable[];
  textBlocks?: string[];
  docId?: DocTypeId;
  lang?: LangCode;
}) {
  const [textOpen, setTextOpen] = useState(false);
  if (!sections.length && !rawTables.length && !textBlocks.length) return null;
  return (
    <div className="space-y-5">
      {sections.map((sec) => (
        <div key={sec.title}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{tSec(sec.title, lang)}</p>
          {sec.fields.filter(f => f.value && f.value !== "—").length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {sec.fields.filter(f => f.value && f.value !== "—").map((f) => (
                    <tr key={f.key} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-muted-foreground w-2/5 font-medium">
                        {tField(f.key, lang, f.label)}
                      </td>
                      <td className="px-4 py-2.5 text-foreground break-words">
                        {f.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sec.tables.map((tbl) => tbl.rows.length > 0 && (
            <div key={tbl.key} className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">{tSec(tbl.label, lang)}</p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {tbl.columns.map(c => <th key={c.key} className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{tField(c.key, lang, c.label)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tbl.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {tbl.columns.map(c => <td key={c.key} className="px-4 py-2 text-foreground">{row.values[c.key] ?? "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}

      {rawTables.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ui("sourceDocTables", lang)}</p>
          {rawTables.map((tbl, idx) => (
            <div key={tbl.blockId ?? idx} className="border-l-4 border-l-orange-400 bg-card border border-border rounded-md p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 mb-3">{ui("table", lang)} {idx + 1}</p>
              {docId === "form7" || docId === "form12" ? (
                <SpannedTable headers={tbl.headers} rows={tbl.rows} lang={lang} />
              ) : (
                <div
                  className="[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top text-foreground"
                  dangerouslySetInnerHTML={{ __html: cleanDocHtml(tbl.html) }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {textBlocks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setTextOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${textOpen ? "rotate-90" : ""}`} />
            {ui("otherText", lang)}
            <span className="ml-1 text-muted-foreground/60 normal-case font-normal tracking-normal">({textBlocks.length})</span>
          </button>
          {textOpen && (
            <div className="mt-2 space-y-2">
              {textBlocks.map((t, i) => (
                <div key={i} className="border-l-4 border-l-border bg-card border border-border rounded-md px-4 py-3 text-sm whitespace-pre-wrap break-words text-foreground">
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type StateUpdater = ExtractionState | ((prev: ExtractionState) => ExtractionState);

function DocUploadCard({
  card,
  state,
  onStateChange,
  lang = "mr",
}: {
  card: DocCard;
  state: ExtractionState;
  onStateChange: (s: StateUpdater) => void;
  lang?: LangCode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const Icon = card.icon;

  const handleFile = useCallback(async (file: File) => {
    let rawFileDataUrl: string | null = null;
    try {
      rawFileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch { /* non-fatal */ }
    onStateChange({ ...DEFAULT_STATE, status: "uploading", filename: file.name, rawFileDataUrl });
    const uploadUrl = `${BASE_URL}/api/extract`;
    const body = new FormData();
    body.append("file", file);
    body.append("document_type", card.id);
    body.append("mode", "accurate");
    try {
      const res = await fetch(uploadUrl, { method: "POST", body, redirect: "error" });
      let data: Record<string, unknown> | null = null;
      try {
        const rawText = await res.text();
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        onStateChange({ ...DEFAULT_STATE, filename: file.name, status: "error", error: "API server is unavailable. Please try again in a moment." });
        return;
      }
      if (!res.ok) {
        onStateChange({ ...DEFAULT_STATE, filename: file.name, status: "error", error: (data?.error as string) ?? `Upload failed (${res.status})` });
        return;
      }
      const reqId = data?.request_id as string;
      if (!reqId) {
        onStateChange({ ...DEFAULT_STATE, filename: file.name, status: "error", error: "Server did not return a request ID." });
        return;
      }
      onStateChange((prev: ExtractionState) => ({ ...prev, status: "processing", requestId: reqId }));
      pollUntilDone(
        reqId,
        (result) => { onStateChange((prev: ExtractionState) => ({ ...prev, ...result })); },
        (msg) => { onStateChange((prev: ExtractionState) => ({ ...prev, status: "error", error: msg })); },
      );
    } catch (err) {
      onStateChange({ ...DEFAULT_STATE, filename: file.name, status: "error", error: err instanceof Error ? err.message : "Network error" });
    }
  }, [card.id, onStateChange]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const busy = state.status === "uploading" || state.status === "processing";
  const isComplete = state.status === "complete";
  const photoSrc = card.id === "aadhar" && state.aadharPhoto
    ? `data:${state.aadharPhoto.mimeType};base64,${state.aadharPhoto.base64}`
    : null;

  return (
    <div className={`rounded-xl border-2 bg-card shadow-sm overflow-hidden transition-all ${
      isComplete
        ? `${card.borderColor} ${card.bgColor}`
        : state.status === "error"
        ? "border-red-200 bg-red-50/30"
        : busy
        ? "border-amber-200 bg-amber-50/30"
        : "border-border bg-card"
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`mt-0.5 flex-shrink-0 p-2 rounded-lg ${card.bgColor}`}>
              <Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground leading-tight">{DOC_CARD_LABELS[card.id]?.[lang] ?? card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{DOC_CARD_DESCS[card.id]?.[lang] ?? card.description}</p>
              {state.filename && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{state.filename}</span>
                </p>
              )}
            </div>
            {photoSrc && (
              <div className="flex-shrink-0">
                <img
                  src={photoSrc}
                  alt="Aadhaar photo"
                  className="w-12 h-14 object-cover rounded-md border-2 border-white shadow-sm"
                />
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {isComplete && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> {ui("extracted", lang)}
              </span>
            )}
            {state.status === "uploading" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <Loader2 className="h-3 w-3 animate-spin" /> {ui("uploading", lang)}
              </span>
            )}
            {state.status === "processing" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <Loader2 className="h-3 w-3 animate-spin" /> {ui("processing", lang)}
              </span>
            )}
            {state.status === "error" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <XCircle className="h-3 w-3" /> {ui("failed", lang)}
              </span>
            )}
            {!busy && (
              <button
                onClick={() => fileRef.current?.click()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isComplete
                    ? "bg-white/80 hover:bg-white border border-border text-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                {isComplete ? ui("reupload", lang) : ui("upload", lang)}
              </button>
            )}
          </div>
        </div>

        {state.status === "idle" && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="mt-3 border-2 border-dashed border-border rounded-lg py-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
          >
            <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
            <p className="text-xs text-muted-foreground">{ui("dropUpload", lang)}</p>
          </div>
        )}

        {state.status === "error" && state.error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {state.error}
          </div>
        )}

        {isComplete && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {translateValue(String(state.sections.reduce((n, s) => n + s.fields.filter(f => f.value && f.value !== "—").length, 0)), lang)} {ui("fieldsExtracted", lang)}
              {state.rawTables.length > 0 ? ` · ${translateValue(String(state.rawTables.length), lang)} ${ui("table", lang)}` : ""}
              {" · "}{ui("reviewNext", lang)}
            </span>
          </div>
        )}

        {isComplete && state.rawFileDataUrl && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Original Document
            </p>
            <img
              src={state.rawFileDataUrl}
              alt={`${card.label} original`}
              className="w-full max-h-64 object-contain rounded-lg border border-border bg-muted/20 shadow-sm"
            />
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff" className="hidden" onChange={onInputChange} />
    </div>
  );
}

// ─── AI Summary analysis ──────────────────────────────────────────────────────

interface SummaryIssue {
  id: string;
  type: "conflict" | "missing" | "format";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  details: { doc: string; value: string }[];
  fieldKeys: (keyof FarmerProfile)[];
}

function getFieldVal(state: ExtractionState, keywords: string[]): string | null {
  if (!state || state.status !== "complete") return null;
  for (const sec of state.sections) {
    for (const field of sec.fields) {
      const k = (field.key ?? "").toLowerCase().replace(/\s+/g, "_");
      if (keywords.some(kw => k.includes(kw.replace(/\s+/g, "_")) || k === kw.replace(/\s+/g, "_"))) {
        if (field.value && field.value.trim() && field.value !== "—") return field.value.trim();
      }
    }
  }
  return null;
}

function normForCompare(v: string): string {
  return v.toLowerCase().replace(/[,।\-\/|]/g, " ").replace(/\s+/g, " ").trim();
}

export function analyzeDocuments(docStates: Record<string, ExtractionState>): SummaryIssue[] {
  const issues: SummaryIssue[] = [];

  const checkConflict = (
    id: string,
    label: string,
    entries: { doc: string; value: string | null }[],
    severity: "high" | "medium",
    fieldKeys: (keyof FarmerProfile)[],
  ) => {
    const present = entries.filter(e => e.value !== null) as { doc: string; value: string }[];
    if (present.length < 2) return;
    const normed = present.map(e => normForCompare(e.value));
    if (!normed.every(n => n === normed[0])) {
      issues.push({
        id,
        type: "conflict",
        severity,
        title: `"${label}" mismatch across documents`,
        description: `The ${label} field has different values in the uploaded documents. Verify which is correct before submitting.`,
        details: present,
        fieldKeys,
      });
    }
  };

  const g = (docId: string, kws: string[]) => getFieldVal(docStates[docId], kws);

  checkConflict("conflict-farmer-name", "Farmer Name", [
    { doc: "Aadhaar", value: g("aadhar", ["full_name", "name"]) },
    { doc: "Bank Passbook", value: g("bank_passbook", ["account_holder_name"]) },
    { doc: "Form 7", value: g("form7", ["owner_names", "owner_name"]) },
    { doc: "Form 8A", value: g("form8a", ["khatedar_name"]) },
  ], "high", ["name", "bankHolderName"]);

  checkConflict("conflict-village", "Village", [
    { doc: "Form 7", value: g("form7", ["village"]) },
    { doc: "Form 8A", value: g("form8a", ["village"]) },
    { doc: "Form 12", value: g("form12", ["village"]) },
  ], "medium", ["village"]);

  checkConflict("conflict-district", "District", [
    { doc: "Form 7", value: g("form7", ["district"]) },
    { doc: "Form 8A", value: g("form8a", ["district"]) },
    { doc: "Form 12", value: g("form12", ["district"]) },
  ], "medium", ["district"]);

  checkConflict("conflict-taluka", "Taluka", [
    { doc: "Form 7", value: g("form7", ["taluka"]) },
    { doc: "Form 8A", value: g("form8a", ["taluka"]) },
    { doc: "Form 12", value: g("form12", ["taluka"]) },
  ], "medium", ["taluka"]);

  checkConflict("conflict-khate-number", "Khate / Account Number", [
    { doc: "Form 7", value: g("form7", ["khate_number", "account_number"]) },
    { doc: "Form 8A", value: g("form8a", ["khate_number", "account_number"]) },
  ], "high", ["khateNumber"]);

  checkConflict("conflict-survey-number", "Survey Number", [
    { doc: "Form 7", value: g("form7", ["survey_number"]) },
    { doc: "Form 12", value: g("form12", ["survey_number"]) },
  ], "medium", ["surveyNumber"]);

  const aadharDone = docStates["aadhar"]?.status === "complete";
  const passbookDone = docStates["bank_passbook"]?.status === "complete";
  const form7Done = docStates["form7"]?.status === "complete";

  if (aadharDone) {
    if (!g("aadhar", ["full_name", "name"])) {
      issues.push({ id: "missing-farmer-name", type: "missing", severity: "high",
        title: "Farmer name not found in Aadhaar",
        description: "Full name could not be read from the Aadhaar card. Manual entry required.",
        details: [{ doc: "Aadhaar", value: "(empty)" }], fieldKeys: ["name"] });
    }
    if (!g("aadhar", ["aadhaar_number", "aadhaar", "uid"])) {
      issues.push({ id: "missing-aadhaar", type: "missing", severity: "high",
        title: "Aadhaar UID number not extracted",
        description: "The 12-digit Aadhaar number is mandatory for identity verification.",
        details: [{ doc: "Aadhaar", value: "(empty)" }], fieldKeys: ["aadhaar"] });
    }
  }

  if (passbookDone) {
    if (!g("bank_passbook", ["account_number"])) {
      issues.push({ id: "missing-bank-account", type: "missing", severity: "high",
        title: "Bank account number not found",
        description: "Account number is required for subsidy and DBT disbursement.",
        details: [{ doc: "Bank Passbook", value: "(empty)" }], fieldKeys: ["bankAccount"] });
    }
    if (!g("bank_passbook", ["ifsc_code", "ifsc"])) {
      issues.push({ id: "missing-ifsc", type: "missing", severity: "medium",
        title: "IFSC code not found in passbook",
        description: "IFSC is required for all direct bank transfers.",
        details: [{ doc: "Bank Passbook", value: "(empty)" }], fieldKeys: ["ifsc"] });
    }
  }

  if (form7Done && !g("form7", ["survey_number"])) {
    issues.push({ id: "missing-survey-number", type: "missing", severity: "medium",
      title: "Survey number missing from Form 7",
      description: "The land survey number is needed for plot identification.",
      details: [{ doc: "Form 7", value: "(empty)" }], fieldKeys: ["surveyNumber"] });
  }

  const aadhaarNum = g("aadhar", ["aadhaar_number", "aadhaar", "uid"]);
  if (aadhaarNum) {
    const digits = aadhaarNum.replace(/\D/g, "");
    if (digits.length !== 12) {
      issues.push({ id: "format-aadhaar-length", type: "format", severity: "high",
        title: "Aadhaar number does not have 12 digits",
        description: `Expected 12 digits but found ${digits.length}. The extracted value may be truncated or contain OCR errors.`,
        details: [{ doc: "Aadhaar", value: aadhaarNum }], fieldKeys: ["aadhaar"] });
    }
  }

  const ifsc = g("bank_passbook", ["ifsc_code", "ifsc"]);
  if (ifsc) {
    const clean = ifsc.trim().toUpperCase().replace(/\s/g, "");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
      issues.push({ id: "format-ifsc", type: "format", severity: "medium",
        title: "IFSC code format looks incorrect",
        description: `Standard IFSC is 11 chars — 4 letters, 0, then 6 alphanumerics (e.g. SBIN0001234). Found: "${ifsc}"`,
        details: [{ doc: "Bank Passbook", value: ifsc }], fieldKeys: ["ifsc"] });
    }
  }

  const mobile = g("aadhar", ["mobile_number", "mobile"]);
  if (mobile) {
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) {
      issues.push({ id: "format-mobile", type: "format", severity: "low",
        title: "Mobile number is not 10 digits",
        description: `Indian mobile numbers must be 10 digits. Found ${digits.length} digit(s): "${mobile}"`,
        details: [{ doc: "Aadhaar", value: mobile }], fieldKeys: ["mobile"] });
    }
  }

  const farmerName = g("aadhar", ["full_name", "name"]) ?? g("bank_passbook", ["account_holder_name"]);
  if (farmerName) {
    const alphOnly = farmerName.replace(/[\u0900-\u097F\s]/g, "").replace(/[a-zA-Z\s.]/g, "");
    if (farmerName.replace(/\s/g, "").length < 3) {
      issues.push({ id: "format-name-short", type: "format", severity: "medium",
        title: "Farmer name appears too short",
        description: `The extracted name "${farmerName}" is unusually short — may be an OCR error.`,
        details: [{ doc: "Aadhaar / Passbook", value: farmerName }], fieldKeys: ["name", "bankHolderName"] });
    } else if (alphOnly.length > 0 && /\d{3,}/.test(farmerName)) {
      issues.push({ id: "format-name-chars", type: "format", severity: "medium",
        title: "Farmer name contains unexpected characters",
        description: `The name "${farmerName}" contains digits or special characters which is unusual.`,
        details: [{ doc: "Aadhaar / Passbook", value: farmerName }], fieldKeys: ["name", "bankHolderName"] });
    }
  }

  return issues;
}

// ─── AI Summary Side Panel ────────────────────────────────────────────────────

function AiSummaryPanel({
  docStates,
  resolvedIds = new Set(),
  onResolve = () => {},
}: {
  docStates: Record<string, ExtractionState>;
  resolvedIds?: Set<string>;
  onResolve?: (id: string) => void;
}) {
  const allIssues = useMemo(() => analyzeDocuments(docStates), [docStates]);
  const issues = allIssues.filter(i => !resolvedIds.has(i.id));
  const resolvedCount = allIssues.length - issues.length;

  const conflicts = issues.filter(i => i.type === "conflict");
  const missing = issues.filter(i => i.type === "missing");
  const format = issues.filter(i => i.type === "format");
  const highCount = issues.filter(i => i.severity === "high").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-2.5 ${
        issues.length === 0 ? "bg-emerald-50 border-emerald-200" :
        highCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
      }`}>
        <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
          issues.length === 0 ? "bg-emerald-100" : highCount > 0 ? "bg-red-100" : "bg-amber-100"
        }`}>
          {issues.length === 0
            ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            : highCount > 0 ? <CircleAlert className="h-3.5 w-3.5 text-red-600" />
            : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs">
            {issues.length === 0 ? "All clear" : `${issues.length} issue${issues.length !== 1 ? "s" : ""} to review`}
          </div>
          {resolvedCount > 0 && (
            <p className="text-[10px] text-emerald-600 font-medium">{resolvedCount} resolved</p>
          )}
        </div>
      </div>

      {conflicts.length > 0 && (
        <IssueGroup icon={<CircleAlert className="h-3.5 w-3.5 text-red-500" />}
          label="Conflicts" labelClass="text-red-700"
          issues={conflicts} accentClass="border-red-200 bg-red-50/50"
          badgeClass="bg-red-100 text-red-700" onResolve={onResolve} />
      )}
      {missing.length > 0 && (
        <IssueGroup icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          label="Missing Fields" labelClass="text-amber-700"
          issues={missing} accentClass="border-amber-200 bg-amber-50/50"
          badgeClass="bg-amber-100 text-amber-700" onResolve={onResolve} />
      )}
      {format.length > 0 && (
        <IssueGroup icon={<Info className="h-3.5 w-3.5 text-orange-500" />}
          label="Format Issues" labelClass="text-orange-700"
          issues={format} accentClass="border-orange-200 bg-orange-50/50"
          badgeClass="bg-orange-100 text-orange-700" onResolve={onResolve} />
      )}

      {issues.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
          {allIssues.length === 0 ? "No issues detected." : "All issues resolved."}
        </div>
      )}
    </div>
  );
}

function fieldKeyToLabel(key: string): string {
  const overrides: Record<string, string> = {
    name: "Full Name", bankHolderName: "Account Holder Name", aadhaar: "Aadhaar No.",
    bankAccount: "Account No.", ifsc: "IFSC Code", village: "Village",
    district: "District", taluka: "Taluka", khateNumber: "Khate No.",
    surveyNumber: "Survey No.", mobile: "Mobile No.",
  };
  return overrides[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}

function jumpToProfileField(key: string) {
  const el = document.getElementById(`profile-field-${key}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus({ preventScroll: true });
  el.style.outline = "2px solid #f59e0b";
  el.style.outlineOffset = "3px";
  el.style.transition = "outline 0.3s ease";
  setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 1800);
}

function IssueGroup({
  icon, label, labelClass, issues, accentClass, badgeClass, onResolve,
}: {
  icon: React.ReactNode;
  label: string;
  labelClass: string;
  issues: SummaryIssue[];
  accentClass: string;
  badgeClass: string;
  onResolve: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-1.5 font-semibold text-xs ${labelClass}`}>
        {icon}
        {label}
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>{issues.length}</span>
      </div>
      {issues.map((issue) => (
        <div key={issue.id} className={`rounded-md border p-3 ${accentClass}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-medium text-xs text-foreground leading-snug flex-1">{issue.title}</div>
            <span className={`flex-shrink-0 text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded ${
              issue.severity === "high" ? "bg-red-100 text-red-600"
              : issue.severity === "medium" ? "bg-amber-100 text-amber-600"
              : "bg-slate-100 text-slate-500"
            }`}>{issue.severity}</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{issue.description}</p>
          {issue.details.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {issue.details.map((d, j) => (
                <div key={j} className="flex items-center gap-1 bg-white/80 border border-white rounded px-2 py-0.5 text-[10px]">
                  <span className="font-semibold text-muted-foreground">{d.doc}:</span>
                  <span className="font-mono text-foreground break-all">{d.value}</span>
                </div>
              ))}
            </div>
          )}
          {issue.fieldKeys.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {issue.fieldKeys.map(fk => (
                <button
                  key={fk}
                  onClick={() => jumpToProfileField(fk)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-blue-50/60 hover:bg-blue-50 rounded px-2 py-0.5 transition-colors"
                >
                  <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
                  {fieldKeyToLabel(fk)}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => onResolve(issue.id)}
            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" />
            Mark as resolved
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Review Tab Bar ───────────────────────────────────────────────────────────

function ReviewTabBar({
  completedCards,
  activeIndex,
  showProfile,
  issueCount,
  onJump,
  onJumpToProfile,
  onBack,
  lang,
}: {
  completedCards: DocCard[];
  activeIndex: number;
  showProfile: boolean;
  issueCount: number;
  onJump: (i: number) => void;
  onJumpToProfile: () => void;
  onBack: () => void;
  lang: LangCode;
}) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border mb-6 -mx-6 px-6 pt-3">
      <div className="flex items-center gap-1 mb-0 overflow-x-auto scrollbar-none">
        <button
          onClick={onBack}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-t-lg mr-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {ui("uploadTab", lang)}
        </button>
        <div className="w-px h-5 bg-border flex-shrink-0 mr-2" />

        {completedCards.map((card, i) => {
          const Icon = card.icon;
          const isActive = !showProfile && activeIndex === i;
          return (
            <button
              key={card.id}
              onClick={() => onJump(i)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all rounded-t-sm whitespace-nowrap ${
                isActive
                  ? `border-b-2 ${card.borderColor.replace("border-", "border-b-")} ${card.color} bg-muted/30`
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? card.color : ""}`} />
              {DOC_CARD_SHORT[card.id]?.[lang] ?? card.shortLabel}
              {(i < activeIndex || showProfile) ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-0.5" />
              ) : null}
            </button>
          );
        })}

        <button
          onClick={onJumpToProfile}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all rounded-t-sm whitespace-nowrap ${
            showProfile
              ? "border-b-2 border-b-primary text-primary bg-muted/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {ui("farmerProfileTab", lang)}
          {issueCount > 0 && (
            <span className={`ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
              showProfile ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
            }`}>
              {issueCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function LangSelector({ lang, onChange }: { lang: LangCode; onChange: (l: LangCode) => void }) {
  const opts: { code: LangCode; label: string }[] = [
    { code: "mr", label: "म" },
    { code: "hi", label: "हि" },
    { code: "en", label: "En" },
  ];
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground mr-1 uppercase tracking-wide font-semibold">Labels:</span>
      {opts.map(o => (
        <button
          key={o.code}
          onClick={() => onChange(o.code)}
          className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
            lang === o.code
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-card border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DocReviewPanel({
  card,
  state,
  index,
  total,
  onPrev,
  onNext,
  isLast,
  lang,
  onLangChange,
  customPhoto,
  onCustomPhotoChange,
}: {
  card: DocCard;
  state: ExtractionState;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
  lang: LangCode;
  onLangChange: (l: LangCode) => void;
  customPhoto: string | null;
  onCustomPhotoChange: (v: string | null) => void;
}) {
  const Icon = card.icon;
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCustomPhotoChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const photoSrc = card.id === "aadhar" && state.aadharPhoto
    ? `data:${state.aadharPhoto.mimeType};base64,${state.aadharPhoto.base64}`
    : null;
  const displayPhoto = customPhoto ?? photoSrc;
  const fieldCount = state.sections.reduce((n, s) => n + s.fields.filter(f => f.value && f.value !== "—").length, 0);

  return (
    <div className="flex flex-col">
      <div className={`rounded-xl border-2 ${card.borderColor} ${card.bgColor} p-5 mb-5`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/70 shadow-sm">
              <Icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${card.color} mb-0.5`}>
                {ui("docNo", lang)} {translateValue(String(index + 1), lang)} {ui("of", lang)} {translateValue(String(total), lang)}
              </p>
              <h3 className="font-bold text-lg text-foreground leading-tight">{DOC_CARD_LABELS[card.id]?.[lang] ?? card.label}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{DOC_CARD_DESCS[card.id]?.[lang] ?? card.description}</p>
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="text-right">
              <p className={`text-2xl font-bold ${card.color}`}>{fieldCount}</p>
              <p className="text-xs text-muted-foreground">{ui("fieldsExtracted", lang)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4 -mt-2">
        <LangSelector lang={lang} onChange={onLangChange} />
      </div>

      {photoSrc && (
        <div className="mb-5 flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="relative group flex-shrink-0">
            <img
              src={displayPhoto!}
              alt="Aadhaar profile photo"
              className="w-24 h-28 object-cover rounded-lg border-2 border-white shadow-md"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white"
            >
              <Camera className="h-4 w-4" />
              <span className="text-[10px] font-semibold">Change</span>
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">{ui("photoExtracted", lang)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{ui("photoFrom", lang)}</p>
            {customPhoto && (
              <button type="button" onClick={() => onCustomPhotoChange(null)} className="mt-2 text-xs text-destructive hover:underline">
                Reset to extracted
              </button>
            )}
          </div>
        </div>
      )}

      {state.rawFileDataUrl ? (
        <>
          {lightboxSrc && (
            <DocLightbox
              src={lightboxSrc}
              label={`${card.label} — Original Document`}
              onClose={() => setLightboxSrc(null)}
            />
          )}
          <div className="flex gap-5 mb-6 items-start">
            <div className="w-[280px] flex-shrink-0 sticky top-4">
              <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground truncate flex-1">Original Document</span>
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(state.rawFileDataUrl!)}
                    className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
                    title="View fullscreen"
                  >
                    <ZoomIn className="h-3 w-3" />
                    Expand
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(state.rawFileDataUrl!)}
                  className="w-full block focus:outline-none group relative"
                  title="Click to view fullscreen"
                >
                  <img
                    src={state.rawFileDataUrl}
                    alt="Uploaded document"
                    className="w-full object-contain max-h-[520px] bg-white"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs font-semibold rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <ZoomIn className="h-3.5 w-3.5" />
                      View fullscreen
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-5">
              <FieldsTable
                sections={state.sections}
                rawTables={state.rawTables}
                textBlocks={state.textBlocks}
                docId={card.id}
                lang={lang}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <FieldsTable
            sections={state.sections}
            rawTables={state.rawTables}
            textBlocks={state.textBlocks}
            docId={card.id}
            lang={lang}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          {ui("previous", lang)}
        </button>

        <button
          onClick={onNext}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
            isLast
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isLast ? ui("reviewProfile", lang) : ui("nextDoc", lang)}
          {isLast ? <ChevronRight className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

type ProfileField = { key: keyof FarmerProfile; label: string; placeholder: string; span?: boolean };

const PROFILE_SECTIONS: {
  id: string;
  docIds: DocTypeId[];
  headerColor: string;
  headerBg: string;
  subHeaderColor: string;
  subsections: { key: string; fields: ProfileField[] }[];
}[] = [
  {
    id: "identity",
    docIds: ["aadhar"],
    headerColor: "text-violet-700",
    headerBg: "bg-violet-50 border-violet-200",
    subHeaderColor: "text-violet-500",
    subsections: [
      {
        key: "identity",
        fields: [
          { key: "name", label: "Full Name", placeholder: "Farmer's full name", span: true },
          { key: "gender", label: "Gender", placeholder: "Male / Female" },
          { key: "dob", label: "Date of Birth", placeholder: "DD/MM/YYYY" },
          { key: "aadhaar", label: "Aadhaar Number", placeholder: "XXXX XXXX XXXX" },
          { key: "vid", label: "Virtual ID (VID)", placeholder: "16-digit Virtual ID" },
          { key: "fathersName", label: "Father's / Husband's / Guardian's Name", placeholder: "Guardian name", span: true },
        ],
      },
      {
        key: "address",
        fields: [
          { key: "address", label: "Address", placeholder: "Residential address", span: true },
          { key: "pincode", label: "PIN Code", placeholder: "6-digit PIN" },
          { key: "state", label: "State", placeholder: "State name" },
        ],
      },
      {
        key: "document",
        fields: [
          { key: "issueDate", label: "Issue Date", placeholder: "DD/MM/YYYY" },
          { key: "mobile", label: "Mobile Number", placeholder: "10-digit number" },
          { key: "enrolmentNumber", label: "Enrolment No.", placeholder: "e.g. 0855/04021/00568" },
        ],
      },
    ],
  },
  {
    id: "bank",
    docIds: ["bank_passbook"],
    headerColor: "text-blue-700",
    headerBg: "bg-blue-50 border-blue-200",
    subHeaderColor: "text-blue-500",
    subsections: [
      {
        key: "bank & branch",
        fields: [
          { key: "bankName", label: "Bank Name", placeholder: "e.g. State Bank of India" },
          { key: "branchName", label: "Branch Name", placeholder: "e.g. Samta Nagar Thane" },
          { key: "branchAddress", label: "Branch Address", placeholder: "Branch full address", span: true },
          { key: "ifsc", label: "IFSC Code", placeholder: "e.g. SBIN0013035" },
          { key: "micrCode", label: "MICR Code", placeholder: "9-digit MICR code" },
        ],
      },
      {
        key: "account holder",
        fields: [
          { key: "bankHolderName", label: "Account Holder Name", placeholder: "Full name of account holder", span: true },
          { key: "email", label: "Email Address", placeholder: "e.g. name@bank.in" },
          { key: "bankCustomerAddress", label: "Customer Address", placeholder: "Customer's mailing address", span: true },
        ],
      },
      {
        key: "account details",
        fields: [
          { key: "bankAccount", label: "Account Number", placeholder: "Account number" },
          { key: "accountType", label: "Account Type", placeholder: "e.g. Regular Savings Bank Account", span: true },
          { key: "customerIdCif", label: "Customer ID (CIF)", placeholder: "CIF number" },
          { key: "accountOpeningDate", label: "Account Opening Date", placeholder: "DD/MM/YYYY" },
        ],
      },
    ],
  },
  {
    id: "form7",
    docIds: ["form7"],
    headerColor: "text-emerald-700",
    headerBg: "bg-emerald-50 border-emerald-200",
    subHeaderColor: "text-emerald-600",
    subsections: [
      {
        key: "location",
        fields: [
          { key: "village", label: "Village", placeholder: "Village name" },
          { key: "taluka", label: "Taluka", placeholder: "Taluka name" },
          { key: "district", label: "District", placeholder: "District name" },
          { key: "surveyNumber", label: "Survey Number", placeholder: "e.g. 392" },
        ],
      },
      {
        key: "ownership",
        fields: [
          { key: "khateNumber", label: "Khate Number", placeholder: "e.g. 103" },
          { key: "occupantClass", label: "Occupant Class", placeholder: "e.g. वर्ग-ग-1" },
          { key: "ownerNames", label: "Owner Name(s)", placeholder: "Full name(s)", span: true },
          { key: "ownerShare", label: "Owner Share / Hissa", placeholder: "e.g. ए" },
        ],
      },
      {
        key: "area & assessment",
        fields: [
          { key: "land", label: "Total Area", placeholder: "e.g. 1.16.30" },
          { key: "nonCultivatedArea", label: "Non-Cultivated Area", placeholder: "e.g. 0.84.50" },
        ],
      },
      {
        key: "rights & encumbrances",
        fields: [
          { key: "boundaryMarks", label: "Boundary & Survey Marks", placeholder: "e.g. सीमा आणी भूमापन चिन्ह", span: true },
        ],
      },
      {
        key: "mutation",
        fields: [
          { key: "lastMutationNumber", label: "Last Mutation No.", placeholder: "e.g. 1423" },

          { key: "previousMutationNumbers", label: "Previous Mutation Numbers", placeholder: "e.g. 1, 118, 715…", span: true },
        ],
      },
    ],
  },
  {
    id: "form12",
    docIds: ["form12"],
    headerColor: "text-green-700",
    headerBg: "bg-green-50 border-green-200",
    subHeaderColor: "text-green-600",
    subsections: [
      {
        key: "location",
        fields: [
          { key: "village", label: "Village", placeholder: "Village name" },
          { key: "taluka", label: "Taluka", placeholder: "Taluka name" },
          { key: "district", label: "District", placeholder: "District name" },
        ],
      },
    ],
  },
  {
    id: "form8a",
    docIds: ["form8a"],
    headerColor: "text-teal-700",
    headerBg: "bg-teal-50 border-teal-200",
    subHeaderColor: "text-teal-600",
    subsections: [
      {
        key: "header details",
        fields: [
          { key: "form8aYear", label: "Year", placeholder: "e.g. 2016-15" },
          { key: "form8aReportDate", label: "Report Date", placeholder: "e.g. 12/20/2016" },
        ],
      },
      {
        key: "khatedar (account holder)",
        fields: [
          { key: "khateNumber", label: "Khate Number", placeholder: "e.g. 159" },
          { key: "khateAccountType", label: "Account Type", placeholder: "e.g. अविभक्त कुटूंब खाते", span: true },
        ],
      },
      {
        key: "totals",
        fields: [
          { key: "land", label: "Total Area", placeholder: "Total area" },
          { key: "totalAssessment", label: "Total Assessment / Judi", placeholder: "Total assessment amount" },
          { key: "totalDamageInherited", label: "Total Damage on Inherited Land", placeholder: "दुमाला जमिनीवरील नुकसान", span: true },
          { key: "totalZpCess", label: "Total ZP Local Cess", placeholder: "Zilla Parishad cess total", span: true },
          { key: "totalGpCess", label: "Total GP Local Cess", placeholder: "Gram Panchayat cess total", span: true },
          { key: "totalRecovery", label: "Total Recovery Amount", placeholder: "एकूण वसुली रक्कम", span: true },
          { key: "grandTotal", label: "Grand Total", placeholder: "Final grand total" },
        ],
      },
    ],
  },
];

const ALL_PROFILE_FIELDS = (() => {
  const seen = new Set<string>();
  return PROFILE_SECTIONS.flatMap(s => s.subsections.flatMap(sub => sub.fields)).filter(f => {
    if (seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });
})();

function EditableHtmlTable({
  html,
  colToProfile,
  profile,
  onChange,
  lang = "mr",
}: {
  html: string;
  colToProfile: Record<number, keyof FarmerProfile>;
  profile: FarmerProfile;
  onChange: (field: keyof FarmerProfile, value: string) => void;
  lang?: LangCode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // On new extraction HTML: render and make all <td> cells contentEditable
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = cleanDocHtml(html);
    const tds = containerRef.current.querySelectorAll<HTMLTableCellElement>("td");
    tds.forEach(td => {
      td.contentEditable = "true";
      td.spellcheck = false;
      td.style.outline = "none";
      td.style.cursor = "text";
      td.style.minWidth = "40px";
    });
    // Highlight columns that are mapped to profile fields
    const rows = containerRef.current.querySelectorAll<HTMLTableRowElement>("tr");
    rows.forEach(row => {
      row.querySelectorAll<HTMLTableCellElement>("td").forEach((cell, ci) => {
        if (colToProfile[ci]) cell.style.backgroundColor = "rgba(20,184,166,0.08)";
      });
    });
  }, [html]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync profile fields → table cells (DOM direct, no state)
  const { land, totalAssessment, totalDamageInherited, totalZpCess, totalGpCess, totalRecovery, grandTotal } = profile;
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll<HTMLTableRowElement>("tr").forEach(row => {
      row.querySelectorAll<HTMLTableCellElement>("td").forEach((cell, ci) => {
        const profileKey = colToProfile[ci];
        if (profileKey && cell !== document.activeElement) {
          const newVal = profile[profileKey] ?? "";
          if (cell.textContent !== newVal) cell.textContent = newVal;
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [land, totalAssessment, totalDamageInherited, totalZpCess, totalGpCess, totalRecovery, grandTotal]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "TD" || !containerRef.current) return;
    containerRef.current.querySelectorAll<HTMLTableRowElement>("tr").forEach(row => {
      const cells = row.querySelectorAll<HTMLTableCellElement>("td");
      cells.forEach((cell, ci) => {
        if (cell === target) {
          const profileKey = colToProfile[ci];
          if (profileKey) onChange(profileKey, target.textContent?.trim() ?? "");
        }
      });
    });
  }, [colToProfile, onChange]);

  return (
    <div
      ref={containerRef}
      onInput={handleInput}
      className="[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top text-foreground [&_td:focus]:bg-primary/5 [&_td:focus]:outline-none"
    />
  );
}

export function FarmerProfileCard({
  docStates,
  profile,
  onChange,
  onApprove,
  approved,
  onBack,
  lang,
  onLangChange,
  customPhoto,
  onCustomPhotoChange,
  hideFooter = false,
  highlightedFields,
  extraDocImages,
}: {
  docStates: Record<DocTypeId, ExtractionState>;
  profile: FarmerProfile;
  onChange: (field: keyof FarmerProfile, value: string) => void;
  onApprove: () => void;
  approved: boolean;
  onBack: () => void;
  lang: LangCode;
  onLangChange: (l: LangCode) => void;
  customPhoto: string | null;
  onCustomPhotoChange: (v: string | null) => void;
  hideFooter?: boolean;
  highlightedFields?: Set<keyof FarmerProfile>;
  /** Fallback doc images fetched from DB (docType → data URL), used when rawFileDataUrl is absent */
  extraDocImages?: Record<string, string>;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [form12EditedCells, setForm12EditedCells] = useState<Record<string, string>>({});
  const [profileLightbox, setProfileLightbox] = useState<{ src: string; label: string } | null>(null);
  const toggleSection = (id: string) =>
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filledCount = ALL_PROFILE_FIELDS.filter(f => Boolean(profile[f.key])).length;
  const photoSrc = docStates["aadhar"]?.aadharPhoto
    ? `data:${docStates["aadhar"].aadharPhoto.mimeType};base64,${docStates["aadhar"].aadharPhoto.base64}`
    : null;
  const displayPhoto = customPhoto ?? photoSrc;
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCustomPhotoChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const form8aRawTable0 = docStates["form8a"]?.rawTables?.[0] ?? null;

  const numCols = useMemo(() => {
    if (!form8aRawTable0) return 0;
    return Math.max(form8aRawTable0.headers.length, ...form8aRawTable0.rows.map(r => r.length), 0);
  }, [form8aRawTable0]);

  const colToProfile = useMemo((): Record<number, keyof FarmerProfile> => {
    if (numCols === 0) return {};
    return {
      [numCols - 1]: "grandTotal",
      [numCols - 2]: "totalGpCess",
      [numCols - 3]: "totalZpCess",
      [numCols - 4]: "totalDamageInherited",
      [numCols - 5]: "totalAssessment",
      [numCols - 6]: "land",
    };
  }, [numCols]);


  return (
    <div className="rounded-xl border-2 border-primary/30 bg-card shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-primary/5 border-b border-primary/20">
        <div className="flex items-center gap-4">
          <div className="relative group flex-shrink-0">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt="Farmer photo"
                className="w-14 h-16 object-cover rounded-xl border-2 border-white shadow-md"
              />
            ) : (
              <div className="w-14 h-16 rounded-xl bg-primary/15 flex items-center justify-center border-2 border-white shadow-md">
                <UserCheck className="h-7 w-7 text-primary" />
              </div>
            )}
            <button
              type="button"
              onClick={() => profilePhotoInputRef.current?.click()}
              className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={profilePhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {profile.name || (lang === "mr" ? "स्वयं-तयार शेतकरी प्रोफाइल" : lang === "hi" ? "स्वतः-निर्मित किसान प्रोफाइल" : "Auto-Built Farmer Profile")}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filledCount} {ui("of", lang)} {ALL_PROFILE_FIELDS.length} {ui("filled", lang)} · {ui("verifyEdit", lang)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LangSelector lang={lang} onChange={onLangChange} />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
            <span className="text-xs">{ui("editable", lang)}</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ── Submitted Documents thumbnails ── */}
        {(() => {
          const available = DOC_CARDS.map(c => {
            const src = docStates[c.id]?.rawFileDataUrl ?? extraDocImages?.[c.id] ?? null;
            return src ? { id: c.id, label: c.label, src } : null;
          }).filter(Boolean) as { id: string; label: string; src: string }[];
          if (available.length === 0) return null;
          return (
            <div>
              {profileLightbox && (
                <DocLightbox
                  src={profileLightbox.src}
                  label={profileLightbox.label}
                  onClose={() => setProfileLightbox(null)}
                />
              )}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <Image className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Submitted Documents</span>
                <span className="ml-auto text-xs text-muted-foreground">{available.length} uploaded</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {available.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setProfileLightbox({ src: doc.src, label: doc.label })}
                    className="group relative flex-shrink-0 rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    style={{ width: 88, height: 110 }}
                    title={`View ${doc.label}`}
                  >
                    <img
                      src={doc.src}
                      alt={doc.label}
                      className="w-full h-full object-cover bg-white"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-1">
                      <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      <span className="text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow text-center leading-tight px-1">{doc.label}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <span className="text-[9px] text-white/90 font-medium truncate block">{doc.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {PROFILE_SECTIONS.map((section) => {
          const isExtracted = section.docIds.some(id => docStates[id]?.status === "complete");
          const allFields = section.subsections.flatMap(sub => sub.fields);
          const sectionFilled = allFields.filter(f => Boolean(profile[f.key as keyof FarmerProfile])).length;
          const form8aRawTables  = section.id === "form8a"  ? (docStates["form8a"]?.rawTables  ?? []) : [];
          const form7RawTables   = section.id === "form7"   ? (docStates["form7"]?.rawTables   ?? []) : [];
          const form12RawTables  = section.id === "form12"  ? (docStates["form12"]?.rawTables  ?? []) : [];
          const sectionLabel = PROFILE_SECTION_DOC_LABELS[section.id]?.[lang] ?? section.id;
          const isCollapsed = collapsedSections.has(section.id);
          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border mb-4 ${section.headerBg} cursor-pointer select-none`}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""} ${section.headerColor}`} />
                  <span className={`text-xs font-bold tracking-wide uppercase ${section.headerColor}`}>
                    {sectionLabel}
                  </span>
                </div>
                <span className={`text-xs font-medium ${section.headerColor} opacity-70`}>
                  {isExtracted ? `${sectionFilled} / ${allFields.length} ${ui("filled", lang)}` : ui("uploadToExtract", lang)}
                </span>
              </button>
              {!isCollapsed && ((section.id === "form8a" || section.id === "form7" || section.id === "form12") ? (
                /* Form 8A / Form 7 / Form 12: extraction-style row layout with editable inputs + raw table */
                <div className="space-y-5">
                  {section.subsections.map((sub) => (
                    <div key={sub.key}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {tSec(sub.key, lang)}
                      </p>
                      <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody>
                            {sub.fields.map(({ key, placeholder }) => {
                              const isHighlighted = highlightedFields?.has(key as keyof FarmerProfile);
                              return (
                              <tr key={key} className={`border-b border-border last:border-0 ${isHighlighted ? "bg-amber-50/60" : ""}`}>
                                <td className="px-4 py-2.5 text-muted-foreground font-medium w-2/5 align-middle whitespace-nowrap">
                                  {tProfileField(key, lang)}
                                  {isHighlighted && <span className="ml-1.5 inline-flex items-center"><AlertTriangle className="h-3 w-3 text-amber-500" /></span>}
                                </td>
                                <td className="px-3 py-1.5 align-middle">
                                  <input
                                    id={`profile-field-${key}`}
                                    type="text"
                                    value={profile[key as keyof FarmerProfile]}
                                    onChange={(e) => onChange(key as keyof FarmerProfile, e.target.value)}
                                    placeholder={placeholder}
                                    className={`w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 transition ${isHighlighted ? "border-amber-400 ring-amber-400/30 bg-amber-50/40 focus:ring-amber-400/40" : "border-input bg-background focus:ring-primary/40"}`}
                                  />
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {/* Form 8A: Holdings editable table */}
                  {section.id === "form8a" && form8aRawTables.length > 0 && form8aRawTable0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {ui("holdingsTitle", lang)}
                      </p>
                      {form8aRawTables.map((tbl, idx) => (
                        <div key={tbl.blockId ?? idx} className="border-l-4 border-l-orange-400 bg-card border border-border rounded-md p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 mb-3">
                            {ui("table", lang)} {idx + 1} <span className="normal-case font-normal text-muted-foreground ml-1">— {ui("clickToEdit", lang)}</span>
                          </p>
                          <div className="overflow-x-auto">
                            <EditableHtmlTable
                              html={tbl.html}
                              colToProfile={idx === 0 ? colToProfile : {}}
                              profile={profile}
                              onChange={onChange}
                              lang={lang}
                            />
                          </div>
                          {idx === 0 && numCols > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {ui("syncNote", lang)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form 7: Ownership editable table */}
                  {section.id === "form7" && form7RawTables.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {ui("ownershipTitle", lang)}
                      </p>
                      {form7RawTables.map((tbl, idx) => (
                        <div key={tbl.blockId ?? idx} className="border-l-4 border-l-emerald-400 bg-card border border-border rounded-md p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-3">
                            {ui("table", lang)} {idx + 1} <span className="normal-case font-normal text-muted-foreground ml-1">— {ui("clickToEdit", lang)}</span>
                          </p>
                          <EditableSpannedTable
                            headers={tbl.headers}
                            rows={tbl.rows}
                            lang={lang}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form 12: Full raw spanned table (single table, full columns) */}
                  {section.id === "form12" && form12RawTables.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {lang === "mr" ? "पीक" : lang === "hi" ? "फसल" : "Crop"}
                      </p>
                      <div className="border-l-4 border-l-green-400 bg-card border border-border rounded-md p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700 mb-3">
                          {lang === "mr" ? "पीक पाहणी नोंदणी" : lang === "hi" ? "फसल निरीक्षण रजिस्टर" : "Crop Inspection Register"} <span className="normal-case font-normal text-muted-foreground ml-1">— {ui("clickToEdit", lang)}</span>
                        </p>
                        <EditableSpannedTable
                          headers={form12RawTables[0].headers}
                          rows={form12RawTables[0].rows}
                          lang={lang}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* All other sections: standard grid input layout */
                <div className="space-y-5">
                  {section.subsections.map((sub) => (
                    <div key={sub.key}>
                      <p className={`text-[10px] font-semibold tracking-widest uppercase mb-2 ${section.subHeaderColor}`}>
                        {tSec(sub.key, lang)}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sub.fields.map(({ key, placeholder, span }) => {
                          const isHighlighted = highlightedFields?.has(key as keyof FarmerProfile);
                          return (
                          <div key={key} className={span ? "sm:col-span-2" : ""}>
                            <label className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${isHighlighted ? "text-amber-600" : "text-muted-foreground"}`}>
                              {tProfileField(key, lang)}
                              {isHighlighted && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                            </label>
                            <input
                              id={`profile-field-${key}`}
                              type="text"
                              value={profile[key as keyof FarmerProfile]}
                              onChange={(e) => onChange(key as keyof FarmerProfile, e.target.value)}
                              placeholder={placeholder}
                              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${isHighlighted ? "border-amber-400 ring-amber-400/30 bg-amber-50/40 focus:ring-amber-400/40" : "border-input bg-background focus:ring-primary/40"}`}
                            />
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}

        {!hideFooter && (approved ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {ui("approvedMsg", lang)}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {ui("backToDocs", lang)}
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <ThumbsUp className="h-4 w-4" />
              {ui("approveBtn", lang)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type DocStates = Record<DocTypeId, ExtractionState>;
const INITIAL_DOC_STATES: DocStates = Object.fromEntries(
  DOC_CARDS.map((c) => [c.id, { ...DEFAULT_STATE }]),
) as DocStates;

export default function NewRegistration() {
  const [form8aLang, setForm8aLang] = useState<LangCode>("en");
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [docStates, setDocStates] = useState<DocStates>(INITIAL_DOC_STATES);
  const [profile, setProfile] = useState<FarmerProfile>({ ...EMPTY_PROFILE });
  const [approved, setApproved] = useState(false);
  const [step, setStep] = useState<WorkflowStep>("upload");
  const [reviewIndex, setReviewIndex] = useState(0);

  const completedCards = DOC_CARDS.filter(c => docStates[c.id].status === "complete");
  const anyBusy = Object.values(docStates).some(s => s.status === "uploading" || s.status === "processing");
  const canProceed = completedCards.length > 0 && !anyBusy;

  useEffect(() => {
    const checkApi = async () => {
      const healthUrl = `${BASE_URL}/api/document-types`;
      try {
        await fetch(healthUrl);
      } catch {}
    };
    checkApi();
  }, []);

  useEffect(() => {
    const anyExtracted = Object.values(docStates).some((s) => s.status === "complete");
    if (!anyExtracted) return;
    const extracted = extractProfileFromStates(docStates);
    setProfile((prev) => {
      const next = { ...prev };
      (Object.keys(extracted) as (keyof FarmerProfile)[]).forEach((k) => {
        if (!prev[k] && extracted[k]) next[k] = extracted[k]!;
      });
      return next;
    });
  }, [docStates]);

  const handleStateChange = useCallback(
    (docId: DocTypeId) => (updater: StateUpdater) => {
      setDocStates((prev) => ({
        ...prev,
        [docId]: typeof updater === "function" ? updater(prev[docId]) : updater,
      }));
    },
    [],
  );

  const handleProfileChange = (field: keyof FarmerProfile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const handleApprove = () => {
    const extractionData: Record<string, { filename: string; sections: SectionData[]; rawTables: RawTable[]; textBlocks: string[]; aadharPhoto: { base64: string; mimeType: string } | null }> = {};
    for (const card of DOC_CARDS) {
      const s = docStates[card.id];
      if (s.status === "complete") {
        extractionData[card.id] = {
          filename: s.filename,
          sections: s.sections,
          rawTables: s.rawTables,
          textBlocks: s.textBlocks,
          aadharPhoto: s.aadharPhoto,
        };
      }
    }
    apiCreateFarmer({
      name: profile.name || "Unknown Farmer",
      village: profile.village || profile.taluka || "—",
      taluka: profile.taluka || "—",
      district: profile.district || "—",
      land: profile.land || "0",
      crop: profile.crop || "—",
      aadhaar: profile.aadhaar || "—",
      khateNumber: profile.khateNumber || "—",
      surveyNumber: profile.surveyNumber || "—",
      bankAccount: profile.bankAccount || "—",
      mobile: profile.mobile || "",
      aadhaarMobile: profile.mobile ? profile.mobile.replace(/\D/g, "").slice(-10) : "",
      status: "Pending",
      source: "ocr",
      extractionData,
      farmerProfile: profile as unknown as Record<string, string>,
    }).then((farmer) => {
      // Save raw document images to MongoDB so they appear in review/registry views
      const imageDocs = DOC_CARDS
        .filter(c => docStates[c.id].status === "complete" && docStates[c.id].rawFileDataUrl)
        .map(c => {
          const dataUrl = docStates[c.id].rawFileDataUrl!;
          const commaIdx = dataUrl.indexOf(",");
          const header = commaIdx > -1 ? dataUrl.slice(0, commaIdx) : "";
          const base64 = commaIdx > -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
          const mimeMatch = header.match(/data:([^;]+);base64/);
          const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
          return { docType: c.id, base64, mimeType };
        });
      if (imageDocs.length > 0) {
        apiSaveDocumentImages(farmer.farmerId, imageDocs).catch(() => {});
      }
      notifyFarmerChange();
    }).catch(() => {});
    setApproved(true);
  };

  const handleProceed = () => {
    setReviewIndex(0);
    setStep("review");
  };

  const handleBackToUpload = () => {
    setStep("upload");
  };

  const handleReviewNext = () => {
    if (reviewIndex < completedCards.length - 1) {
      setReviewIndex(i => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setReviewIndex(completedCards.length);
    }
  };

  const handleReviewPrev = () => {
    if (reviewIndex > 0) {
      setReviewIndex(i => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [resolvedIssueIds, setResolvedIssueIds] = useState<Set<string>>(new Set());

  const showProfileCard = step === "review" && reviewIndex === completedCards.length;

  const allIssues = useMemo(
    () => (step === "review" ? analyzeDocuments(docStates) : []),
    [docStates, step],
  );
  const activeIssues = allIssues.filter(i => !resolvedIssueIds.has(i.id));
  const issueCount = activeIssues.length;
  const highlightedFields = useMemo(
    () => new Set(activeIssues.flatMap(i => i.fieldKeys)) as Set<keyof FarmerProfile>,
    [activeIssues],
  );

  const handleResolveIssue = (id: string) => {
    setResolvedIssueIds(prev => new Set([...prev, id]));
  };

  if (step === "upload") {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-lg">{ui("newRegTitle", form8aLang)}</h2>
            <LangSelector lang={form8aLang} onChange={setForm8aLang} />
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            {ui("newRegDesc", form8aLang)}
          </p>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {DOC_CARDS.map((card) => (
              <DocUploadCard
                key={card.id}
                card={card}
                state={docStates[card.id]}
                onStateChange={handleStateChange(card.id)}
                lang={form8aLang}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {completedCards.length > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {translateValue(String(completedCards.length), form8aLang)} {ui("docsReady", form8aLang)}
                {anyBusy && ` · ${ui("waitingProcessing", form8aLang)}`}
              </span>
            ) : anyBusy ? (
              <span className="flex items-center gap-1.5 text-amber-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ui("processingDocs", form8aLang)}
              </span>
            ) : (
              <span>{ui("uploadFirst", form8aLang)}</span>
            )}
          </div>
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-all shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {ui("proceedReview", form8aLang)}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const jumpTo = (i: number) => { setReviewIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="w-full">
      <ReviewTabBar
        completedCards={completedCards}
        activeIndex={reviewIndex}
        showProfile={showProfileCard}
        issueCount={issueCount}
        onJump={jumpTo}
        onJumpToProfile={() => jumpTo(completedCards.length)}
        onBack={handleBackToUpload}
        lang={form8aLang}
      />

      {!showProfileCard && completedCards[reviewIndex] && (
        <DocReviewPanel
          card={completedCards[reviewIndex]}
          state={docStates[completedCards[reviewIndex].id]}
          index={reviewIndex}
          total={completedCards.length}
          onPrev={handleReviewPrev}
          onNext={handleReviewNext}
          isLast={reviewIndex === completedCards.length - 1}
          lang={form8aLang}
          onLangChange={setForm8aLang}
          customPhoto={customPhoto}
          onCustomPhotoChange={setCustomPhoto}
        />
      )}

      {showProfileCard && (
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            <FarmerProfileCard
              docStates={docStates}
              profile={profile}
              onChange={handleProfileChange}
              onApprove={handleApprove}
              approved={approved}
              onBack={() => jumpTo(completedCards.length - 1)}
              lang={form8aLang}
              onLangChange={setForm8aLang}
              customPhoto={customPhoto}
              onCustomPhotoChange={setCustomPhoto}
              highlightedFields={highlightedFields}
            />
          </div>
          <div className="w-72 flex-shrink-0 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="font-semibold text-sm text-foreground">AI Summary</span>
              {issueCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 bg-red-100 text-red-600">
                  {issueCount}
                </span>
              )}
            </div>
            <AiSummaryPanel
              docStates={docStates}
              resolvedIds={resolvedIssueIds}
              onResolve={handleResolveIssue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
