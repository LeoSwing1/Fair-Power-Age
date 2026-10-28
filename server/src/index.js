import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 4100);
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '..', '.env') });
dotenv.config({ path: path.join(here, '.env'), override: false });
// Vercel serverless filesystems are read-only except for /tmp. The JSON store is demo-only
// and is not durable/shared across serverless instances; use a real database for production.
const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? '/tmp/fair-power-age-data' : path.join(here, '..', 'data');
const storePath = path.join(dataDir, 'store.json');
const configuredOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map(x => x.trim().replace(/\/$/, '')).filter(Boolean);
const defaultOrigins = ['https://fairpowerage.vercel.app', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin(origin, callback) {
  // Non-browser requests have no Origin header. Browser requests must match an explicit allowlist.
  const normalizedOrigin = origin ? origin.replace(/\/$/, '') : '';
  if (!origin || allowedOrigins.has(normalizedOrigin)) return callback(null, true);
  console.warn(`Blocked CORS origin: ${origin}`);
  return callback(null, false);
}, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const initialState = () => ({ enquiries: [], quotations: [], careerApplications: [], notifications: [], paymentDetails: { accountHolder: 'Fair Power Age Private Limited', bankName: '', accountNumber: '', ifsc: '', branch: '', upiId: '', paymentInstructions: '' }, mockDataResetAt: new Date().toISOString() });
let state = initialState();
let saveQueue = Promise.resolve();
const clients = new Set();
const sessions = new Map();
async function loadState(){ try { state = JSON.parse(await readFile(storePath,'utf8')); state.enquiries ||= []; state.quotations ||= []; state.careerApplications ||= []; state.notifications ||= []; state.paymentDetails ||= initialState().paymentDetails; } catch { await mkdir(dataDir,{recursive:true}); state = initialState(); await persist(); } }
function persist(){ saveQueue = saveQueue.then(async()=>{ await mkdir(dataDir,{recursive:true}); await writeFile(storePath, JSON.stringify(state,null,2),'utf8'); }).catch(err=>{ console.error('State persistence failed:', err?.message || err); if (!isVercel) throw err; }); return saveQueue; }
function publish(type, payload={}) { const event={ type, payload, at:new Date().toISOString() }; state.notifications.unshift({id:`NTF-${Date.now()}`, ...event, read:false}); state.notifications=state.notifications.slice(0,100); persist().catch(console.error); const data=`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`; for(const res of clients) res.write(data); }
function requireAdmin(req,res,next){ const auth=req.headers.authorization||''; const token=auth.startsWith('Bearer ')?auth.slice(7):''; const session=sessions.get(token); if(!session||session.expires<Date.now()){ if(token)sessions.delete(token); return res.status(401).json({error:'Admin session expired. Please sign in again.'}); } req.adminSession=session; next(); }
function safeEqual(a,b){ const x=Buffer.from(String(a)); const y=Buffer.from(String(b)); return x.length===y.length && timingSafeEqual(x,y); }
const enquirySchema = z.object({ name:z.string().trim().min(2).max(120), company:z.string().trim().max(160).optional().default(''), email:z.string().trim().email().max(254), phone:z.string().trim().min(7).max(30), category:z.enum(['Electrical','Fire Safety','PPE','Cable Management','Services / AMC']), requirements:z.string().trim().max(5000).optional().default(''), source:z.string().trim().max(100).optional().default('website') });
app.get('/api/health', (_req,res)=>res.json({ok:true,service:'fair-power-age-api',mode:process.env.NODE_ENV||'development',liveSync:!isVercel,storage:isVercel?'ephemeral-tmp-json-demo':'local-json-demo',storageWarning:isVercel?'Demo data may reset and is not shared between serverless instances. Configure a persistent database for production.':undefined,externalIntegrations:'require-provider-credentials'}));
app.get('/api/events', (req,res)=>{ if (isVercel) { res.set('Cache-Control','no-store'); return res.status(501).json({error:'Live event streaming is not supported by this serverless demo deployment. Use polling or a hosted realtime service.'}); } res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','Access-Control-Allow-Origin':req.headers.origin||'*'}); res.write(`event: connected\ndata: ${JSON.stringify({type:'connected',at:new Date().toISOString()})}\n\n`); clients.add(res); const ping=setInterval(()=>res.write(': keepalive\n\n'),20000); req.on('close',()=>{clearInterval(ping);clients.delete(res);}); });
app.get('/api/catalogue',(_req,res)=>res.json({data:[],note:'Product repository is not configured yet.'}));
app.post('/api/admin/login',(req,res)=>{ const password=String(req.body?.password||''); const expected=process.env.ADMIN_PASSWORD||'Fairpowerage'; if(!safeEqual(password,expected)) return res.status(401).json({error:'Incorrect admin password.'}); const token=randomBytes(32).toString('hex'); sessions.set(token,{role:'admin',expires:Date.now()+8*60*60*1000}); return res.json({token,expiresIn:28800,role:'admin'}); });
app.get('/api/admin/state',requireAdmin,(_req,res)=>res.json({data:{enquiries:state.enquiries,quotations:state.quotations,careerApplications:state.careerApplications,paymentDetails:state.paymentDetails,notifications:state.notifications,mockDataResetAt:state.mockDataResetAt}}));
app.post('/api/admin/reset-demo',requireAdmin,async(_req,res)=>{ state={...initialState(),paymentDetails:state.paymentDetails||initialState().paymentDetails,mockDataResetAt:new Date().toISOString()}; await persist(); const resetEvent=`event: demo.reset\ndata: ${JSON.stringify({type:'demo.reset',payload:{message:'Demo records cleared'},at:new Date().toISOString()})}\n\n`; for(const client of clients)client.write(resetEvent); res.json({ok:true,message:'Demo enquiries, quotations and notifications cleared.',data:state}); });
app.patch('/api/admin/enquiries/:id',requireAdmin,async(req,res)=>{ const item=state.enquiries.find(x=>x.id===req.params.id); if(!item)return res.status(404).json({error:'Enquiry not found'}); const schema=z.object({status:z.enum(['New','Contacted','Quote requested','Qualified','Closed'])}); const parsed=schema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Invalid status'}); item.status=parsed.data.status; item.updatedAt=new Date().toISOString(); await persist(); publish('enquiry.updated',{id:item.id,status:item.status,company:item.company||item.name}); res.json({data:item}); });
app.post('/api/enquiries',async(req,res)=>{ const parsed=enquirySchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Invalid enquiry',issues:parsed.error.flatten()}); const record={id:`LEAD-${Date.now()}`,...parsed.data,status:'New',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; state.enquiries.unshift(record); await persist(); publish('enquiry.created',{id:record.id,company:record.company||record.name,category:record.category}); return res.status(201).json({data:record,mode:'local-json-demo',message:'Enquiry stored locally and live-sync event sent.'}); });
app.get('/api/enquiries',requireAdmin,(_req,res)=>res.json({data:state.enquiries}));
app.post('/api/quotations',requireAdmin,async(req,res)=>{ const schema=z.object({customer:z.string().trim().min(2).max(160),enquiryId:z.string().optional().default(''),amount:z.string().optional().default(''),notes:z.string().max(3000).optional().default('')}); const parsed=schema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Invalid quotation'}); const q={id:`QUO-${Date.now()}`,...parsed.data,status:'Draft',createdAt:new Date().toISOString()};state.quotations.unshift(q);await persist();publish('quotation.created',{id:q.id,customer:q.customer});res.status(201).json({data:q});});

const careerApplicationSchema = z.object({ name:z.string().trim().min(2).max(120), email:z.string().trim().email().max(254), phone:z.string().trim().min(7).max(30), role:z.string().trim().min(2).max(160), experience:z.string().trim().max(100).optional().default(''), message:z.string().trim().max(3000).optional().default(''), consent:z.literal(true) });
app.post('/api/careers/applications',async(req,res)=>{ const parsed=careerApplicationSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Please check the application details and consent.',issues:parsed.error.flatten()}); const record={id:`APP-${Date.now()}`,...parsed.data,status:'New',createdAt:new Date().toISOString()}; state.careerApplications.unshift(record); await persist(); publish('career.application.created',{id:record.id,name:record.name,role:record.role}); return res.status(201).json({data:{id:record.id,status:record.status,createdAt:record.createdAt},message:'Application received.'}); });
app.get('/api/payment-details',(_req,res)=>{ const p=state.paymentDetails||initialState().paymentDetails; res.json({data:{accountHolder:p.accountHolder||'Fair Power Age Private Limited',bankName:p.bankName||'',accountNumber:p.accountNumber||'',ifsc:p.ifsc||'',branch:p.branch||'',upiId:p.upiId||'',paymentInstructions:p.paymentInstructions||'',configured:Boolean(p.bankName&&p.accountNumber&&p.ifsc)}}); });
app.put('/api/admin/payment-details',requireAdmin,async(req,res)=>{ const schema=z.object({accountHolder:z.string().trim().max(160).optional().default('Fair Power Age Private Limited'),bankName:z.string().trim().max(160).optional().default(''),accountNumber:z.string().trim().max(80).optional().default(''),ifsc:z.string().trim().max(30).optional().default(''),branch:z.string().trim().max(160).optional().default(''),upiId:z.string().trim().max(160).optional().default(''),paymentInstructions:z.string().trim().max(1000).optional().default('')}); const parsed=schema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Invalid payment details'}); state.paymentDetails=parsed.data; await persist(); publish('payment.details.updated',{configured:Boolean(state.paymentDetails.bankName&&state.paymentDetails.accountNumber&&state.paymentDetails.ifsc)}); res.json({data:state.paymentDetails,message:'Payment details saved and synced to the public website.'}); });
app.get('/api/integrations/status',(_req,res)=>res.json({data:[{id:'email',status:process.env.EMAIL_PROVIDER_API_KEY?'configured-needs-verification':'not-configured'},{id:'whatsapp',status:process.env.WHATSAPP_ACCESS_TOKEN?'configured-needs-verification':'not-configured'},{id:'payments',status:process.env.PAYMENT_PROVIDER_SECRET?'configured-needs-verification':'not-configured'},{id:'database',status:process.env.DATABASE_URL?'configured-needs-connection-test':'local-json-demo-storage'},{id:'crm',status:process.env.CRM_API_BASE_URL?'configured-needs-verification':'adapter-not-configured'},{id:'inventory',status:process.env.INVENTORY_API_BASE_URL?'configured-needs-verification':'adapter-not-configured'}]}));
app.use((err,_req,res,_next)=>{console.error('API error:',err?.message||err);res.status(500).json({error:'Internal server error'});});
await loadState();
app.listen(port,()=>console.log(`Fair Power Age API listening on http://localhost:${port} | live sync enabled | demo admin password is set via ADMIN_PASSWORD`));
