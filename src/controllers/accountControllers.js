const User = require('../models/userModel')
const Admin = require('../models/adminModel')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const path = require('path')
const nodemailer = require('nodemailer')
const fs = require('fs')
const crypto = require('crypto')
const multer = require('multer')
const { google } = require('googleapis');
const dotenv = require('dotenv')
dotenv.config();

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const extname = path.extname(file.originalname);
        const originalFileName = file.originalname;
        const fileNameWithoutExtension = path.parse(originalFileName).name.split(' ').join('');

        cb(null, `${fileNameWithoutExtension}_${Date.now()}${extname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowExtensions = ['.jpg', '.jpeg', '.png'];
        const extname = path.extname(file.originalname);

        if (allowExtensions.includes(extname)) {
            cb(null, true);
        } else {
            const error = new Error('Hanya file dengan ekstensi jpg, jpeg, atau png yang diperbolehkan.');
            cb(error);
        }
    },
});

const signUp = async (req, res) => {
    try {
        const { email, password, gender, number_telephone, year, NIK, NIM, prodi, fullName, accountNumber } = req.body
       
        const equalUserByEmail = await User.findOne({ email })
        if(equalUserByEmail) return res.json({ status: 400, message: 'Email sudah terdaftar!' })
        
        const equalUserByNIM = await User.findOne({ NIM })
        if(equalUserByNIM) return res.json({ status: 400, message: `Pengguna dengan NIM ${NIM} sudah ada!` })
 
        const id = crypto.randomBytes(20).toString('hex')

        const salt = await bcrypt.genSalt(10)
        const passwordHashGenerate = await bcrypt.hash(password, salt)

        const newUser = new User({
            fullName,
            email,
            password: passwordHashGenerate,
            gender,
            user_id: id,
            number_telephone,
            NIK,
            NIM, 
            prodi,
            year,
            accountNumber,
            typePhoto: gender === 'Male' ? 'man1' : 'woman1'
        })

        await newUser.save()
        return res.json({ status: 200, message: 'Daftar berhasil!' })

    } catch (error) {
        return res.json({ status: 500, message: 'Daftar gagal!', error: error });
    }
}

const signIn = async (req, res) => {
    try {
        const {NIM, password} = req.body

        const user = await User.findOne({ NIM })
        if(!user) return res.json({ status: 404, message: 'Pengguna tidak ada!' })

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ status: 401, message: 'Password salah!' });
        }

        const token = jwt.sign({ user_id: user.user_id }, 'Unipay', { expiresIn: '2h' });
        return res.json({ status: 200, token, data: user, message: 'Berhasil masuk!' });
        
    } catch (error) {
        return res.json({ status: 500, message: 'Masuk gagal!', error: error.message });
    }
} 

const getAccountById = async (req, res) => {
    try {
        const { user_id } = req.params

        if(!user_id) {
            return res.json({ status: 400, message: 'Kirim userID dahulu!'});
        }

        const resultAccount = await User.findOne({user_id})
        if(!resultAccount) {
            return res.json({ status: 404, message: 'Pengguna tidak ada!' });
        }
        
        return res.json({ status: 200, message: 'Berhasil dapatkan data pengguna!', data: resultAccount });

    } catch (error) {
        return res.json({ status: 500, message: 'Server bermasalah!', error: error.message });
    }
}

const removeUser = async (req, res) => {
    try {
        const { NIM } = req.params

        const equalUser = await User.findOne({ NIM })
        if(!equalUser) return res.json({ status: 404, message: 'Pengguna tidak ada!' })

        const deleteConsumer = await User.deleteOne({ NIM })
        if(!deleteConsumer) return res.json({ status: 500, message: 'Gagal hapus pengguna!' })

        return res.json({ status: 200, message: 'Berhasil hapus pengguna', data: equalUser })
    } catch (error) {
        return res.json({ status: 500, message: 'Server bermasalah!', error })
    }
}

const getAllUser = async (req, res) => {
    try {
        const { fullName } = req.params

        const filter = {}
        if(fullName) filter.fullName = fullName 

        const user = await User.find(filter)
        if(user === 0) return res.json({ statua: 404, mesage: 'Pengguna tidak ada!' })

        return res.json({ status: 200, message: 'Berhasil dapatkan data pengguna!', data: user })

    } catch (error) {
        return res.json({ status: 500, message: 'Server bermasalah!', error })
    }
}

const updateUserAccount = async (req, res) => {
    try {
        const { user_id } = req.params
        const { fullName, email, number_telephone, gender, type_photo } = req.body
        
        const requiredFields = ['email', 'fullName', 'gender', 'type_photo'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.json({ status: 401, message: 'Lengkapi data dahulu!'});
        }
        
        const filter = { user_id }
        const set = { 
            fullName, 
            email, 
            number_telephone, 
            gender, 
            typePhoto: type_photo
         } 

         const update = await User.updateOne(filter, set)
         if(update) {
             return res.json({ status: 200, message: 'Berhasil perbarui data!', data: set })
         }else {
             return res.json({ status: 500, message: 'Perbarui data gagal!', error: error.message })
         }

    } catch (error) {
        return res.json({ status: 500, message: 'Server bermasalah!', error: error.message })
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body

        console.log(email);

        const equalEmail = await User.findOne({email})
        if(!equalEmail) return res.json({ status: 404, message: 'Pengguna tidak ada!' })

        const resetTokenPassword = crypto.randomBytes(8).toString('hex')

        const filter = { email }
        const set = {
            resetTokenPassword
        }

        await User.updateOne(filter, set)

        // const oauth2Client = new google.auth.OAuth2(
        //     process.env.CLIENT_ID,
        //     process.env.CLIENT_SECRET, 
        //     process.env.URI_REDIRECT
        // );
        
        // oauth2Client.setCredentials({
        //     refresh_token: process.env.REFRESH_TOKEN
        // });

        // const transporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         type: 'OAuth2',
        //         user: 'developervalclass@gmail.com',
        //         clientId: process.env.CLIENT_ID,
        //         clientSecret: process.env.CLIENT_SECRET,
        //         refreshToken: process.env.REFRESH_TOKEN,
        //         accessToken: oauth2Client.getAccessToken() 
        //     }
        // });

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'developervalclass@gmail.com',
                pass: 'zprtcezkbqqihwpz'
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
                        <h2>Reset Your Password</h2>
                        <p>You are receiving this email because you (or someone else) has requested to reset the password for your account. Please click the link below to reset your password:</p>
                        <a href="http://localhost:3000/auth/resetPassword/${resetTokenPassword}">Reset Password</a>
                        <p>If you didn't request this, please ignore this email, and your password will remain unchanged.</p>
                    </div>
                </body>
            </html>
        `;

        const mailOptions = {
            to: email,
            from: 'developervalclass@gmail.com',
            subject: 'Reset password by Unipay',
            html: emailContent
        }

        transporter.sendMail(mailOptions, async (err) => {
            if(err) return res.json({ status: 500, message: 'Kirim pesan email gagal', error: err.message })
            return res.json({ status: 200, message: 'Berhasil kirim pesan email!' })
        })

    } catch (error) {
        return res.json({ status: 500, message: 'Server bermasalah!', error: error.message })
    }
}

const resetPassword = async (req, res) => {
    try {   
        const { password } = req.body
        const { token } = req.params 
        if (!password) {
            return res.status(400).json({ status: 400, message: 'Password is required!' });
        }
          
        const equalEmail = await User.findOne({ 
            resetTokenPassword: token,
        })

        if(!equalEmail) return res.json({ status: 404, message: 'Invalid or expired token!' })
        
        const salt = await bcrypt.genSalt(10)
        const newPassword = await bcrypt.hash(password, salt)

        const filter = { resetTokenPassword: token }
        const set = {
            password: newPassword,
            resetTokenPassword: '',
        }

        const updateResult = await User.updateOne(filter, set)

        if (updateResult) {
            return res.status(200).json({ status: 200, message: 'Password successfully reset!' });
        } else {
            return res.status(500).json({ status: 500, message: 'Failed to reset password!' });
        }

    } catch (error) {
        return res.json({ status: 500, message: 'Server failed!', error: error.message })
    }
}

// =================================================

const signUpAdmin = async (req, res) => {
    try {
        const { email_admin, password, telephone_admin, admin_name } = req.body
       
        const equalUserByEmail = await User.findOne({ email_admin })
        if(equalUserByEmail) return res.json({ status: 400, message: 'Email already exist!' })
        
        const id = crypto.randomBytes(20).toString('hex')

        const salt = await bcrypt.genSalt(10)
        const passwordHashGenerate = await bcrypt.hash(password, salt)

        const newAdmin = new Admin({
            email_admin,
            password: passwordHashGenerate,
            admin_id: id,
            admin_name,
            telephone_admin,
            role: 'admin'
        })

        await newAdmin.save()
        return res.json({ status: 200, message: 'Berhasil daftar admin!' })

    } catch (error) {
        return res.json({ status: 500, message: 'Proses daftar gagal!', error: error });
    }
}

const signInAdmin = async (req, res) => {
    try {
        const {email_admin, password} = req.body

        const admin = await Admin.findOne({ email_admin })
        if(!admin) return res.json({ status: 404, message: 'Account not found!' })

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.json({ status: 401, message: 'Incorrect password!' });
        }

        const token = jwt.sign({ admin_id: admin.admin_id }, 'Unipay', { expiresIn: '2h' });
        return res.json({ status: 200, token, data: admin, message: 'Berhasil masuk!' });

    } catch (error) {
        return res.json({ status: 500, message: 'Proses masuk gagal!', error: error.message });
    }
}

module.exports = {
    signUp,
    signIn,
    getAccountById,
    getAllUser, 
    removeUser,
    updateUserAccount,
    forgotPassword,
    resetPassword,
    signUpAdmin,
    signInAdmin,
    upload
}