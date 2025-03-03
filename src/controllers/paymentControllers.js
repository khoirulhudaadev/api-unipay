const historyTransaction = require('../models/historyTransaction')
const historyWithdrawAdmin = require('../models/historyWithdrawAdmin')
const canteenModel = require('../models/canteenRevenueModel')
const adminRevenueModel = require('../models/adminRevenueModel')
const paymentMethodModel = require('../models/methodePayment')
const User = require('../models/userModel')
const nodemailer = require('nodemailer')
const path = require('path')
const dotenv = require('dotenv')
const fs = require('fs')
const crypto = require('crypto')
const toRupiah = require('../helpers/toRupiah')
dotenv.config()

const { Payout: PayoutClient, Invoice: InvoiceClient, Balance: BalanceClient  } = require('xendit-node');
const xenditPayoutClient = new PayoutClient({ secretKey: process.env.XENDIT_API_KEY });
const xenditInvoice = new InvoiceClient({secretKey: process.env.XENDIT_API_KEY})
const xenditBalanceClient = new BalanceClient({secretKey: process.env.XENDIT_API_KEY})

const handlePaymentCallback = async (req, res) => {
    try {
        const callbackData = req.body;
        console.log('callback', callbackData)
        await updateDatabase(callbackData.external_id, callbackData)

        return res.json({ status: 200, data: callbackData });

    } catch (error) {
        return res.json({ status: 500, message: 'Payment failed!', error: error.message })    
    }
}

// Withdraw
  
const disbursementPayment = async (req, res) => {
    try {
      const {
        amount,
        fullName,
        number_telephone,
        email,
        description,
        typePayment,
        NIM,
        classRoom,
        note,
        prodi,
        channelCode,
        year,
        accountNumber,
        accountHolderName,
      } = req.body;

      const requiredFields = ['amount', 'year', 'prodi', 'accountHolderName', 'accountNumber', 'NIM', 'classRoom', 'typePayment', 'email', 'fullName']
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
          return res.json({ status: 401, message: 'Data masih kurang!'});
      }

      const referenceId = crypto.randomBytes(20).toString('hex')

      const data = {
        "amount" : amount,
        "channelProperties" : {
          "accountNumber" : String(accountNumber),
          "accountHolderName" : accountHolderName
        },
        "description" : "Withdraw (balance)",
        "currency" : "IDR",
        "type" : "DIRECT_DISBURSEMENT",
        "referenceId" : referenceId,
        "channelCode" : channelCode
      }
      
      const response = await xenditPayoutClient.createPayout({
          idempotencyKey: referenceId,
          data
      })
        
      if(response) {
        const filter = { NIM }
        const existingData = await User.findOne(filter);
        
        if (existingData) {
            const set = { balance: existingData.balance - amount };
            await User.updateOne(filter, set)

            const dataHistory = {
              history_id: NIM+"OF_ID"+referenceId,
              email,
              description,
              fullName,
              note,
              status: 'WITHDRAW',
              amount,
              number_telephone,
              NIM,
              code: 'WITHDRAW_STUDENT',
              prodi,
              year,
              type_payment: typePayment,
              classRoom,
              recipient: NIM
          }
    
          const historyTransactionSave = new historyTransaction(dataHistory)
    
          await historyTransactionSave.save()
          return res.json({status: 200, message: 'Pencairan berhasil!', data: response});
        }
          return res.json({ status: 404, message: 'Pengguna tidak ada!' });
      }
      
    } catch (error) {
      return res.json({ status: 500, error: 'Server Error', message: error.message });
    }
};
  
// Withdraw for admin IKMI

const disbursementPaymentAdmin = async (req, res) => {
    try {
      const {
        amount,
        description,
        channelCode,
        accountNumber,
        accountHolderName,
      } = req.body;

      const requiredFields = ['amount', 'channelCode', 'accountNumber', 'accountHolderName']
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
          return res.json({ status: 401, message: 'Data masih kurang!'});
      }

      const referenceId = crypto.randomBytes(20).toString('hex')

      const data = {
        "amount" : amount,
        "channelProperties" : {
          "accountNumber" : String(accountNumber),
          "accountHolderName" : accountHolderName
        },
        "description" : "Withdraw (balance)",
        "currency" : "IDR",
        "type" : "DIRECT_DISBURSEMENT",
        "referenceId" : referenceId,
        "channelCode" : channelCode
      }
      
      const response = await xenditPayoutClient.createPayout({
          idempotencyKey: referenceId,
          data
      })
        
      if(response) {
        
        const responseAdminRevenue = await adminRevenueModel.updateOne({}, { $inc: { revenueAdmin: -amount } })

        const dataHistory = {
            history_id: referenceId,
            description,
            status: 'Pencairan dana kampus',
            amount,
            channel_code: channelCode,
            account_number: String(accountNumber)
        }

        const historyTransactionSave = new historyWithdrawAdmin(dataHistory)

        const saveHistory = await historyTransactionSave.save()

        if(!responseAdminRevenue || !saveHistory) {
          return res.json({status: 500, message: 'Pencairan gagak!', dataRevenue: responseAdminRevenue, dataSave: saveHistory });
        }

        return res.json({status: 200, message: 'Pencairan berhasil!', data: response});
        
      } else {
        return res.json({ status: 500, error: 'Proses pencairan terhambat!' });
      }
      
    } catch (error) {
      return res.json({ status: 500, error: 'Server Error', message: error.message });
    }
};

// Top-up

const createPayment = async (req, res) => {
  try {

    const {
      amount,
      fullName,
      number_telephone,
      email,
      description,
      typePayment,
      year,
      prodi,
      NIM,
      to,
      classRoom,
      note
    } = req.body;

    const requiredFields = ['amount', 'classRoom'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.json({ status: 401, message: 'Data masih kurang!'});
    }
    
    const referenceId = crypto.randomBytes(5).toString('hex')
    
    const data = {
      "amount" : amount,
      "invoiceDuration" : 172800,
      "externalId" : NIM+"OF_ID"+referenceId,
      "description" : description,
      "currency" : "IDR",
      "reminderTime" : 1,
      "successRedirectUrl": "http://localhost:3000/successPayment",
    }

    const response = await xenditInvoice.createInvoice({
        data
    })

    if(response) {
      const dataHistory = {
          history_id: NIM+"OF_ID"+referenceId,
          email,
          status: 'PENDING',
          description,
          fullName,
          note,
          amount,
          number_telephone,
          year,
          NIM,
          code: 'TOP-UP',
          prodi,
          recipient: to,
          type_payment: typePayment,
          classRoom
      }

      const historyTransactionSave = new historyTransaction(dataHistory)

      await historyTransactionSave.save()
      
      return res.json({ status: 200, message: 'Your payment is still pending!', data: response})

    } else {
      return res.json({ status: 500, message: 'Pembayaran gagal!', data: response})
    }
    
  } catch (error) {
    return res.json({ status: 500, message: 'Server bermasalah!', error: error.message})
  }
}

// Transfer canteen and administration

const createTransfer = async (req, res) => {
  try {

    const {
      amount,
      fullName,
      number_telephone,
      email,
      description,
      typePayment,
      year,
      NIM,
      to,
      classRoom,
      code,
      note,
      prodi
    } = req.body;

    const requiredFields = ['amount', 'classRoom', 'NIM', 'typePayment'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.json({ status: 401, message: 'Data masih kurang!'});
    }

    const referenceId = crypto.randomBytes(5).toString('hex')
    
    const dataHistory = {
        history_id: NIM+"OF_ID"+referenceId,
        email,
        status: 'Transaction (Unipay)',
        description,
        fullName,
        note,
        amount,
        number_telephone,
        year,
        code,
        NIM,
        prodi,
        recipient: to,
        type_payment: typePayment,
        classRoom
    }

    const filterBalance = { NIM };

    const dataBalance = await User.findOne(filterBalance)
    
    if(!dataBalance) {
      return { status: 404, message: 'Pengguna tidak ada!' };
    }

    const minusBalanceWithTopUp = {
      balance: dataBalance.balance - amount
    };
    
    if(typePayment === 'Canteen') {
      const responseCanteen = await canteenModel.findOneAndUpdate({}, { $inc: { revenueCanteen: amount } }, { new: true, upsert: true })
      const historyTransactionSave = new historyTransaction(dataHistory)
      const response = await historyTransactionSave.save()
      
      if(response && responseCanteen) {
        await User.updateOne(filterBalance, minusBalanceWithTopUp);
        return res.json({ status: 200, message: 'Transaksi berhasil!', data: response})
      } else {
        return res.json({ status: 500, message: 'Pembayaran kantin gagal!', data: response})
      }
    } else if(typePayment === 'Transfer') {
      
      if(NIM !== to) {
        const filterBalanceTo = { NIM: to };
        
        const dataUserTo = await User.findOne({ NIM: to })
        if(dataUserTo === 0) return res.json({ status: 404, message: 'Penerima tidak terdaftar!'})

        const addBalanceWithTopUp = {
          balance: dataUserTo.balance + amount
        }
        
        if(dataUserTo) {
          const transporter = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                  user: 'muhammadkhoirulhuda111@gmail.com',
                  pass: 'pwdi hnbx usqq xwnh'
              }
          })
          
          const cssPath = path.join(__dirname, '../styles/style.css');
          const cssStyles = fs.readFileSync(cssPath, 'utf8');
          
          const emailContent = `
              <!DOCTYPE html>
              <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta http-equiv="X-UA-Compatible" content="IE=edge">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                          ${cssStyles}
                      </style>
                  </head>
                  <body>
                      <div class="container">
                          <h2>Ada kiriman uang untuk kamu!</h2>
                          <p style='color: black'>Pengirim : ${fullName}</p>
                          <p style='color: black'>Nominal : ${toRupiah(amount)}</p>
                      </div>
                  </body>
              </html>
          `;
    
          const mailOptions = {
              to: dataUserTo.email,
              from: 'muhammadkhoirulhuda111@gmail.com',
              subject: 'Kiriman uang - Unipay',
              html: emailContent
          }
    
          transporter.sendMail(mailOptions, async (err) => {
              if(err) return res.json({ status: 500, message: 'Gagal kirim email saat transfer!', error: err.message })
              
              await User.updateOne(filterBalanceTo, addBalanceWithTopUp);
              await User.updateOne(filterBalance, minusBalanceWithTopUp);
              
              const historyTransactionSave = new historyTransaction(dataHistory)
              const response = await historyTransactionSave.save()
             
              if(response) return res.json({ status: 200, message: 'Transaksi berhasil!' })
              
              res.json({ status: 500, message: 'Gagal transfer!', error: err.message })
          })
        } else {
          return res.json({ status: 404, message: 'Penerima tidak ada!' })
        } 
       
      }else {
        return res.json({ status: 500, message: 'Transaksi tidak sah!'})
      }
    } else {
      const responseAdminRevenue = await adminRevenueModel.findOneAndUpdate({}, { $inc: { revenueAdmin: amount } }, { new: true, upsert: true });
      const historyTransactionSave = new historyTransaction(dataHistory)
      const response = await historyTransactionSave.save()
      console.log(responseAdminRevenue)
      if(response && responseAdminRevenue) {
        await User.updateOne(filterBalance, minusBalanceWithTopUp);
        return res.json({ status: 200, message: 'Transaksi berhasil!', data: response})
      } else {
        return res.json({ status: 500, message: 'Pembayaran gagal!', dataTransaction: response, dataRevenue: responseAdminRevenue})
      }
    }
    
  } catch (error) {
    return res.json({ status: 500, message: 'Server bermasalah!', error: error.message})
  }
}

const getBalanceUnipay = async (req, res) => {
  try {
    const response = await xenditBalanceClient.getBalance({})
    return res.json({ status: 200, message: 'Total saldo pada unipay!', data: response })
  } catch (error) {
    return res.json({ status: 500, message: 'Server bermasalah!', error: error.message})
  }
}

const getRevenueAdministration = async (req, res) => {
  try {
    const response = await adminRevenueModel.find()
    return res.json({ status: 200, message: 'Saldo ikmi saat ini!', data: response })
  } catch (error) {
    return res.json({ status: 205000, message: 'Server bermasalah!', error: error.message })
  }
}

const getRevenueCanteen = async (req, res) => {
  try {
    const response = await canteenModel.find()
    return res.json({ status: 200, message: 'Saldo canteen saat ini!', data: response })
  } catch (error) {
    return res.json({ status: 205000, message: 'Server bermasalah!', error: error.message })
  }
}
  
const updateDatabase = async (external_id, data) => {
  try {

    const external = external_id.split('OF_ID')
    const resultExternal = external[0]
    console.log('ex_id', external_id)
    console.log('resultExternal', resultExternal)

    const filterBalance = { NIM: resultExternal };

    const dataBalance = await User.findOne(filterBalance)
    if(!dataBalance) {
      return { status: 404, message: 'Pengguna tidak ada!' };
    }

    const addBalanceWithTopUp = {
      balance: dataBalance.balance + data.amount,
    };

    if(data.status === 'PAID') {
      await User.updateOne(filterBalance, addBalanceWithTopUp);
      await historyTransaction.updateOne({history_id: external_id}, { status: 'PAID' })

      return res.json({ status: 200, message: 'Success update status payment!', data: response})
    }else {
      return res.json({ status: 200, message: `Status payment is ${data.status}!` })
    }
          
  } catch (error) {
      return { status: 500, message: 'Server bermasalah!', error: error.message }
    }
};
  
const getAllPaymentMethods = async (req, res) => {
  try {
      const getPayment = await paymentMethodModel.find()
      
      if(getPayment === 0) return res.json({ status: 404, message: 'Data payment not found!' })

      return res.json({ status: 200, message: 'All data payment methods', data: getPayment })

  } catch (error) {
      return res.json({ status: 500, message: 'Server bermasalah!', error: error.message });
  }
}

const getAllHistoryPayments = async (req, res) => {
  try {
    const { NIM, typePayment, classRoom, year, prodi } = req.body  
    
    const filter = {}
    if(NIM) filter.NIM = NIM
    if(typePayment) filter.typePayment = typePayment
    if(classRoom) filter.classRoom = classRoom
    if(year) filter.year = year
    if(prodi) filter.prodi = prodi

    const historyData = await historyTransaction?.find(filter)?.sort({ created_at: -1 })?.limit(8)
    if(historyData === 0) return res.json({ status: 404, message: 'History not found!' }) 

    return res.json({ status: 200, message: 'Successfully get history payments!', data: historyData }) 

  } catch (error) {
    return res.json({ status: 500, message: 'Server bermasalah!', error: error.message });
  }
}

const getAllHistoryWDAdmin = async (req, res) => {
  try {
    const response = await historyWithdrawAdmin.find()
    if(response === 0) return res.json({ status: 404, message: 'Riwayat kosong!' })
  
    return res.json({ status: 200, message: 'Berhasil dapatkan riwayat pencairan!', data: response });
  
  } catch (error) {
    return res.json({ status: 500, message: 'Server bermasalah!', error: error.message });
  }
}

const updatePaymentMethod = async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ status: 400, message: 'Data harus array!', data: updates });
    }

    const updatePromises = updates.map(async (update) => {
      const { type_payment, minimum_payment, note } = update;

      // Cek apakah elemen dengan type_payment sudah ada dalam array payments
      const existingPayment = await paymentMethodModel.findOne({ 'payments.type_payment': type_payment });

      if (existingPayment) {
        // Jika elemen sudah ada, lakukan pembaruan
        const result = await paymentMethodModel.updateOne(
          { 'payments.type_payment': type_payment },
          {
            $set: {
              'payments.$.minimum_payment': minimum_payment,
              'payments.$.note_payment': note,
            },
          },
          { new: true }
        );
        return result;
      } else {
        // Jika elemen belum ada, lakukan penambahan baru
        const result = await paymentMethodModel.updateOne(
          {},
          {
            $push: {
              payments: {
                type_payment,
                minimum_payment,
                note_payment: note,
              },
            },
          },
          { upsert: true, new: true }
        );
        return result;
      }
    });

    const results = await Promise.all(updatePromises);

    console.log('results', results);

    if (!results) {
      return res.json({ status: 404, message: 'Tidak ada data diperbarui!', data: updates });
    }

    return res.json({ status: 200, message: 'Berhasil perbarui sistem pembayaran!', data: updates });
  } catch (error) {
    return res.json({ status: 500, message: 'Server bermasalah!', error: error.message });
  }
};


module.exports = {
    handlePaymentCallback,
    createPayment,
    disbursementPayment,
    disbursementPaymentAdmin,
    getAllPaymentMethods,
    getAllHistoryPayments,
    createTransfer,
    getBalanceUnipay,
    getRevenueAdministration,
    getRevenueCanteen,
    getAllHistoryWDAdmin,
    updatePaymentMethod
}