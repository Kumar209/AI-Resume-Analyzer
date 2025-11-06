import React, { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';
import {prepareInstructions} from "../../contants/index";
import FileUploader from '~/components/FileUploader';
import { convertPdfToImage } from '~/lib/pdf2img';
import { generateUUID } from '~/lib/utils';

const upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    // State for processing status and status text
    const [isProcessing, setIsProcessing] = useState(false); 
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // form fields + errors
    const [formValues, setFormValues] = useState({
        companyName: '',
        jobTitle: '',
        jobDescription: ''
    });
    const [errors, setErrors] = useState({
        companyName: '',
        jobTitle: '',
        jobDescription: '',
        file: ''
    });

    const handleFileSelect = (file: File | null) => {
        setFile(file)
         setErrors({
        ...errors,
        file: '' // Clear the file error
    });
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Properly map hyphenated names to camelCase
        const nameMap: { [key: string]: string } = {
            'company-name': 'companyName',
            'job-title': 'jobTitle', 
            'job-description': 'jobDescription'
        };
        
        const fieldName = nameMap[e.target.name] || e.target.name;
        
        setFormValues({
            ...formValues,
            [fieldName]: e.target.value
        });
        setErrors({
            ...errors,
            [fieldName]: ''
        });
    };

    const validate = () => {
        const newErrors = {
        companyName: '',
        jobTitle: '',
        jobDescription: '',
        file: ''
        };
        if (!formValues.companyName.trim()) newErrors.companyName = 'Company Name is required';
        if (!formValues.jobTitle.trim()) newErrors.jobTitle = 'Job Title is required';
        if (!formValues.jobDescription.trim()) newErrors.jobDescription = 'Job Description is required';
        if (!file) newErrors.file = 'Please upload a resume (PDF)';

        setErrors(newErrors);
        return !Object.values(newErrors).some((msg) => msg !== '');
    };

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);

        setStatusText('Uploading the file...');
        const uploadedFile = await fs.upload([file]);
        if(!uploadedFile) return setStatusText('Error: Failed to upload file');

        setStatusText('Converting to image...');
        const imageFile = await convertPdfToImage(file);
        if(!imageFile.file) return setStatusText('Error: Failed to convert PDF to image');

        setStatusText('Uploading the image...');
        const uploadedImage = await fs.upload([imageFile.file]);
        if(!uploadedImage) return setStatusText('Error: Failed to upload image');

        setStatusText('Preparing data...');
        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName, jobTitle, jobDescription,
            feedback: '',
        }
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analyzing...');

        //feedback from ai service uses claude-sonnet-4 changed to claude-3-7-sonnet model
        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({ jobTitle, jobDescription })
        )
        if (!feedback) return setStatusText('Error: Failed to analyze resume');

        const feedbackText = typeof feedback.message.content === 'string'
            ? feedback.message.content
            : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText('Analysis complete, redirecting...');
        console.log(data);
        // navigate(`/resume/${uuid}`);
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) return;
        console.log({ companyName, jobTitle, jobDescription, file });

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan4.gif" className="w-[60%]" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name <span className="text-red-500">*</span></label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name"  onChange={handleChange} />
                                {errors.companyName && <p className="text-red-500 text-sm">{errors.companyName}</p>}
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title <span className="text-red-500">*</span></label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title"  onChange={handleChange} />
                                {errors.jobTitle && <p className="text-red-500 text-sm">{errors.jobTitle}</p>}
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description <span className="text-red-500">*</span></label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description"   onChange={handleChange}/>
                                {errors.jobDescription && <p className="text-red-500 text-sm">{errors.jobDescription}</p>}
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume <span className="text-red-500">*</span></label>
                                <FileUploader onFileSelect={handleFileSelect} />
                                {errors.file && <p className="text-red-500 text-sm">{errors.file}</p>}
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}

export default upload