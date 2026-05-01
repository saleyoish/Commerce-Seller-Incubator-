"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  Building2,
  Package,
  Video,
  Wrench,
  Clock,
} from "lucide-react";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  what_you_sell: string;
  has_live_experience: boolean;
}

const productCategories = [
  "Fashion",
  "Beauty",
  "Electronics",
  "Home",
  "Toys",
  "Sports",
  "Books",
  "Other",
];

const inventoryValues = [
  { value: "under_5k", label: "Under $5,000" },
  { value: "5k_to_25k", label: "$5,000 - $25,000" },
  { value: "25k_to_100k", label: "$25,000 - $100,000" },
  { value: "over_100k", label: "Over $100,000" },
];

const priceRanges = [
  { value: "under_25", label: "Under $25" },
  { value: "25_to_50", label: "$25 - $50" },
  { value: "50_to_100", label: "$50 - $100" },
  { value: "over_100", label: "Over $100" },
];

const monthlyGoals = [
  { value: "under_1k", label: "Under $1,000" },
  { value: "1k_to_5k", label: "$1,000 - $5,000" },
  { value: "5k_to_10k", label: "$5,000 - $10,000" },
  { value: "over_10k", label: "Over $10,000" },
];

export function ApplicationForm({
  waitlistEntry,
}: {
  waitlistEntry: WaitlistEntry;
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalSteps = 6;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("waitlistId", waitlistEntry.id);

    try {
      const response = await fetch("/api/application/submit", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        posthog.capture("application_submitted", {
          waitlist_id: waitlistEntry.id,
          email: waitlistEntry.email,
        });
        setIsSubmitted(true);
      } else {
        alert("Failed to submit application. Please try again.");
      }
    } catch (error) {
      posthog.captureException(error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-2 border-green-200">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted!
          </h2>
          <p className="text-gray-600 mb-4">
            Thank you for completing your application. Our team will review it within 24 hours.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              You'll receive an email with next steps once approved. Check your spam folder if you don't see it.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
              i + 1 === step
                ? "bg-red-600 text-white"
                : i + 1 < step
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {i + 1 < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`w-full h-1 mx-2 ${
                i + 1 < step ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">Step {step} of {totalSteps}</Badge>
          </div>
          <CardTitle className="text-2xl">Seller Application</CardTitle>
          <p className="text-sm text-gray-600">
            Complete all sections to apply for TikTok Shop Fast Track
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <StepIndicator />

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={waitlistEntry.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={waitlistEntry.email}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={waitlistEntry.phone}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  name="street"
                  placeholder="Street Address"
                  className="mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input name="city" placeholder="City" />
                  <Input name="state" placeholder="State" />
                  <Input name="zip" placeholder="ZIP" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Business Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Do you have an LLC or registered business?</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasLlc"
                        value="yes"
                        className="w-4 h-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasLlc"
                        value="no"
                        className="w-4 h-4"
                        defaultChecked
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name (optional)</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    placeholder="Your business name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / EIN (optional)</Label>
                  <Input
                    id="taxId"
                    name="taxId"
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Product Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Categories *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {productCategories.map((category) => (
                      <label
                        key={category}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          name="productCategories"
                          value={category}
                        />
                        <span className="text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productPhotos">Product Photos (up to 5)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG up to 5MB each
                    </p>
                    <input
                      type="file"
                      id="productPhotos"
                      name="productPhotos"
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estimated Inventory Value</Label>
                    <Select name="inventoryValue">
                      <SelectTrigger>
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryValues.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Average Product Price Range</Label>
                    <Select name="priceRange">
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceRanges.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Video className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Experience & Goals</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Have you sold on TikTok Shop before?</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tiktokExperience"
                        value="yes"
                        className="w-4 h-4"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tiktokExperience"
                        value="no"
                        className="w-4 h-4"
                        defaultChecked
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Have you done live streaming before?</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="liveExperience"
                        value="yes"
                        className="w-4 h-4"
                        defaultChecked={waitlistEntry.has_live_experience}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="liveExperience"
                        value="no"
                        className="w-4 h-4"
                        defaultChecked={!waitlistEntry.has_live_experience}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktokUsername">TikTok Username (if you have one)</Label>
                  <Input
                    id="tiktokUsername"
                    name="tiktokUsername"
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly Revenue Goal</Label>
                  <Select name="monthlyGoal">
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthlyGoals.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Wrench className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Equipment & Setup</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>What equipment do you have? (Check all that apply)</Label>
                  <div className="space-y-2">
                    {[
                      "Smartphone with good camera",
                      "Ring light or lighting setup",
                      "Microphone",
                      "Tripod or phone stand",
                      "Stable internet connection",
                      "Quiet space for streaming",
                      "Computer for OBS setup",
                      "External camera (webcam/DSLR)",
                    ].map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox name="equipment" value={item} />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Availability</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>How many hours per week can you stream?</Label>
                  <Select name="hoursPerWeek">
                    <SelectTrigger>
                      <SelectValue placeholder="Select hours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_5">Under 5 hours</SelectItem>
                      <SelectItem value="5_to_10">5-10 hours</SelectItem>
                      <SelectItem value="10_to_20">10-20 hours</SelectItem>
                      <SelectItem value="over_20">Over 20 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preferred streaming times (Check all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "morning", label: "Morning (6AM - 12PM)" },
                      { value: "afternoon", label: "Afternoon (12PM - 5PM)" },
                      { value: "evening", label: "Evening (5PM - 9PM)" },
                      { value: "late_night", label: "Late Night (9PM - 12AM)" },
                    ].map((time) => (
                      <label
                        key={time.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox name="preferredTimes" value={time.value} />
                        <span className="text-sm">{time.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    Ready to Submit?
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Please review your information before submitting. Our team will 
                    review your application within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={() => {
                  const nextStep = step + 1;
                  posthog.capture("application_step_advanced", {
                    from_step: step,
                    to_step: nextStep,
                    total_steps: totalSteps,
                    email: waitlistEntry.email,
                  });
                  setStep(nextStep);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
