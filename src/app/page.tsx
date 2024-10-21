/* eslint-disable no-console */
"use client"
import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { motion, AnimatePresence } from "framer-motion"
import { contractABI } from "./contractABI"
import { Loader2, Plus, Check, AlertCircle, Menu, X, Vote, Users, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

declare global {
  interface Window {
    ethereum: ethers.Eip1193Provider;
  }
}

interface Candidate {
  id: bigint;
  name: string;
  voteCount: bigint;
}

export default function Home() {
  const contractAddress = "0x9ff0F2350c4DeBa158fC7E44F6DFa545b4EA98CA"
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidateName, setCandidateName] = useState<string>("")
  const [voteCandidateId, setVoteCandidateId] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [hasVoted, setHasVoted] = useState(false)
  const [balance, setBalance] = useState<string>("")

  const addDebugInfo = useCallback((info: string) => {
    setDebugInfo(prev => prev + "\n" + safeStringify(info))
  }, [])

  const connectWallet = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      addDebugInfo("Connecting wallet...")
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const account = await signer.getAddress()
      setAccount(account)
      setProvider(provider)
      setSigner(signer)
      addDebugInfo("Wallet connected. Account: " + account)
      
      const balance = await provider.getBalance(account)
      const balanceInEth = ethers.formatEther(balance)
      setBalance(balanceInEth)
      addDebugInfo("Account balance: " + balanceInEth + " ETH")
      
      addDebugInfo("Initializing contract...")
      const contract = new ethers.Contract(contractAddress, contractABI, signer)
      setContract(contract)
      addDebugInfo("Contract initialized.")
      
      await loadCandidates(contract)
      setSuccess("Wallet connected successfully!")
    } catch (error) {
      console.error("Error connecting to wallet:", error)
      setError("Failed to connect wallet. Please try again.")
      addDebugInfo("Error connecting wallet: " + safeStringify(error))
    } finally {
      setIsLoading(false)
    }
  }, [addDebugInfo])

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            addDebugInfo("Ethereum detected and account found. Connecting...")
            await connectWallet()
          } else {
            addDebugInfo("Ethereum detected but no accounts found.")
          }
        } catch (error) {
          addDebugInfo("Error checking connection: " + safeStringify(error))
        }
      } else {
        addDebugInfo("Ethereum not detected.")
      }
    }

    checkConnection()
  }, [addDebugInfo, connectWallet])

  const loadCandidates = async (contractInstance: ethers.Contract) => {
    addDebugInfo("Loading candidates...")
    const candidatesArray: Candidate[] = []
    for (let i = 1; i <= 10; i++) {
      try {
        const candidate = await contractInstance.getCandidate(i)
        candidatesArray.push({
          id: candidate[0],
          name: candidate[1],
          voteCount: candidate[2]
        })
      } catch (error) {
        addDebugInfo("Error loading candidate " + i + ": " + safeStringify(error))
        break
      }
    }
    setCandidates(candidatesArray)
    addDebugInfo("Candidates loaded: " + candidatesArray.length)
  }

  const addCandidate = async () => {
    if (!contract || candidateName.trim() === "") return
    setIsLoading(true)
    setError(null)
    try {
      addDebugInfo("Adding candidate: " + candidateName)
      const tx = await contract.addCandidate(candidateName)
      await tx.wait()
      await loadCandidates(contract)
      setCandidateName("")
      setSuccess("Candidate added successfully!")
      addDebugInfo("Candidate added successfully")
    } catch (error) {
      console.error("Error adding candidate", error)
      setError("Failed to add candidate. Please try again.")
      addDebugInfo("Error adding candidate: " + safeStringify(error))
    } finally {
      setIsLoading(false)
    }
  }

  const vote = async (id: number) => {
    if (!contract) {
      console.error("Contract is not initialized.")
      return
    }

    try {
      const tx = await contract.vote(id)
      await tx.wait()
      setHasVoted(true)
      setSuccess("Vote cast successfully!")
      await loadCandidates(contract)
    } catch (error) {
      console.error("Voting failed:", error)
      setError("Voting failed. Please try again.")
    }
  }

  const safeStringify = (obj: unknown): string => {
    return JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  }

  const dismissNotification = () => {
    setError(null)
    setSuccess(null)
  }

  const disconnectWallet = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setContract(null)
    setCandidates([])
    setCandidateName("")
    setVoteCandidateId(1)
    setIsLoading(false)
    setError(null)
    setSuccess(null)
    setIsSidebarOpen(false)
    setDebugInfo("")
    setHasVoted(false)
    setBalance("")
  }

  const Sidebar = () => (
    <div className="p-6 h-full flex flex-col justify-between">
      <div>
        <h2 className="text-3xl font-bold mb-6 text-pink-300">Voting System</h2>
        {!account ? (
          <Button onClick={connectWallet} disabled={isLoading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-all duration-300 transform hover:scale-105">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connect Wallet"}
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-pink-400 mb-2">Connected Account:</p>
            <p className="font-mono text-xs break-all text-pink-300 bg-gray-800 p-2 rounded">{account}</p>
            <p className="text-sm text-pink-400 mb-2">Balance:</p>
            <p className="font-mono text-xs break-all text-pink-300 bg-gray-800 p-2 rounded">{balance} ETH</p>
          </div>
        )}
      </div>
      {account && (
        <Button onClick={disconnectWallet} className="w-full bg-red-700 hover:bg-red-600 text-white mt-4 transition-all duration-300 transform hover:scale-105">
          Disconnect Wallet
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-gray-900 to-black text-pink-200">
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-40 bg-gray-900 text-pink-300">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-gray-900 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <aside className="hidden md:block w-64 bg-gray-900 shadow-lg">
        <Sidebar />
      </aside>

      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-4"
            >
              {error && (
                <Alert variant="destructive" className="bg-red-900 border-red-700 text-pink-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert variant="default" className="bg-green-900 border-green-700 text-pink-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-pink-200 hover:text-pink-100"
                    onClick={dismissNotification}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Alert>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {account && (
          <Tabs defaultValue="add-candidate" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 rounded-lg p-1">
              <TabsTrigger value="add-candidate" className="data-[state=active]:bg-pink-700 data-[state=active]:text-white rounded-md transition-all duration-300">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Candidate
              </TabsTrigger>
              <TabsTrigger value="vote" className="data-[state=active]:bg-pink-700 data-[state=active]:text-white rounded-md transition-all duration-300">
                <Vote className="w-4 h-4 mr-2" />
                Vote
              </TabsTrigger>
              <TabsTrigger value="candidates" className="data-[state=active]:bg-pink-700 data-[state=active]:text-white rounded-md transition-all duration-300">
                <Users className="w-4 h-4 mr-2" />
                Candidates
              </TabsTrigger>
            </TabsList>
            <TabsContent value="add-candidate">
              <Card className="bg-gray-900 border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-pink-300">Add a Candidate</CardTitle>
                  <CardDescription className="text-pink-400">Enter the name of the new candidate below.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <Input
                      type="text"
                      placeholder="Candidate name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full sm:w-auto bg-gray-800 text-pink-200 border-gray-700 focus:border-pink-500 rounded-lg"
                    />
                    <Button onClick={addCandidate} disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-all duration-300 transform hover:scale-105">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="vote">
              <Card className="bg-gray-900 border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-pink-300">Cast Your Vote</CardTitle>
                  <CardDescription className="text-pink-400">Select a candidate ID to vote for.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <Input
                      type="number"
                      value={voteCandidateId}
                      onChange={(e) => setVoteCandidateId(Number(e.target.value))}
                      min="1"
                      placeholder="Candidate ID"
                      className="w-full sm:w-auto bg-gray-800 text-pink-200 border-gray-700 focus:border-pink-500 rounded-lg"
                    />
                    <Button onClick={() => vote(voteCandidateId)} disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-all duration-300 transform hover:scale-105">
                      {isLoading ? <Loader2 className="mr-2  h-4 w-4 animate-spin" /> : "Vote"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="candidates">
              <Card className="bg-gray-900 border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-pink-300">Candidates List</CardTitle>
                  <CardDescription className="text-pink-400">View all registered candidates and their vote counts.</CardDescription>
                </CardHeader>
                <CardContent>
                  {candidates.length > 0 ? (
                    <ul className="space-y-2">
                      {candidates.map((candidate, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <span className="font-medium text-pink-300 mb-1 sm:mb-0 text-lg">{candidate.name}</span>
                          <span className="text-sm text-pink-400 bg-gray-700 px-3 py-1 rounded-full">
                            ID: {candidate.id.toString()}, Votes: {candidate.voteCount.toString()}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-pink-400">No candidates available yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        <Card className="mt-6 bg-gray-900 border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-pink-300">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs text-pink-400 bg-gray-800 p-4 rounded-lg overflow-auto max-h-60">{debugInfo}</pre>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}