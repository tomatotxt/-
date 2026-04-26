-- ==============================================================================
-- [SINGLE INSTANCE / OVERRIDE LOGIC] (Feature 5)
-- ==============================================================================

if getgenv().TomatoConnections then
    print("!!! OVERRIDING PREVIOUS SCRIPT INSTANCE !!!")
    for i, connection in pairs(getgenv().TomatoConnections) do
        if connection then
            pcall(function() connection:Disconnect() end)
        end
    end
    _G.LoopCancel = true
    getgenv().TomatoAutoFarm = false
    task.wait(0.2)
end

getgenv().TomatoConnections = {}

local function TrackConnection(connection)
    table.insert(getgenv().TomatoConnections, connection)
    return connection
end

getgenv().TomatoAutoFarm = true

-- ==============================================================================
-- [SETUP & LOCALS]
-- ==============================================================================

local ALERTS_ENABLED = true
local CurrentlyFarming = false
local Escaped = false

local VirtualUser = game:GetService("VirtualUser")
local LocalPlayer = game:GetService("Players").LocalPlayer
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Multiplayer = Workspace:WaitForChild("Multiplayer")
local Camera = Workspace.CurrentCamera

-- Remotes (Feature 4)
local RemoteFolder = ReplicatedStorage:WaitForChild("Remote")
local AddedWaiting = RemoteFolder:WaitForChild("AddedWaiting")
local AlertRemote = RemoteFolder:WaitForChild("Alert")

-- Alert Listener
TrackConnection(AlertRemote.OnClientEvent:Connect(function(msg)
    if type(msg) == "string" and msg:lower():match("escaped") then
        Escaped = true
    end
end))

-- Anti-AFK
TrackConnection(LocalPlayer.Idled:Connect(function()
    VirtualUser:CaptureController()
    VirtualUser:ClickButton2(Vector2.new())
end))

-- ==============================================================================
-- [ALERT SYSTEM]
-- ==============================================================================

local Colors = {
    System  = Color3.fromRGB(200, 200, 200), -- Grey/White
    Success = Color3.fromRGB(0, 255, 127),   -- Spring Green
    Warning = Color3.fromRGB(255, 170, 0),   -- Orange
    Error   = Color3.fromRGB(255, 60, 60),   -- Red
    Info    = Color3.fromRGB(0, 220, 255),   -- Cyan
    Item    = Color3.fromRGB(170, 85, 255)   -- Purple
}

local CLMAIN = LocalPlayer.PlayerScripts:WaitForChild("CL_MAIN_GameScript")
local CLMAINenv = getsenv(CLMAIN)
local Alert

if CLMAINenv and CLMAINenv.newAlert then
    -- Fixed Alert Function: Color is Arg 2, Time is Arg 3 (nil = default)
    Alert = function(Text, ColorType)
        if ALERTS_ENABLED then
            local SelectedColor = Colors[ColorType] or Colors.System
            local Output = tostring(Text)
            
            pcall(function() 
                -- Structure: newAlert(Message, Color, Time, Style)
                -- We set Time to nil so the game uses its default duration
                CLMAINenv.newAlert(Output, SelectedColor, nil, nil) 
            end)
            print(Output)
        end
    end
else
    Alert = function(Text, ...)
        print("[CONSOLE] " .. tostring(Text))
    end
    print("Your executor does not support Alerts.")
end

function isRandomString(str)
    if #str == 0 then return false end
    for i = 1, #str do
        local ltr = str:sub(i, i)
        if ltr:lower() == ltr then
            return false
        end
    end
    return true
end

local function GetChar()
    return LocalPlayer.Character or (LocalPlayer.CharacterAdded:wait() and LocalPlayer.Character)
end

local function Noclip(Toggle)
    local char = GetChar()
    if char then
        for i, v in char:GetChildren() do
            if v.ClassName == "Part" then
                v.CanCollide = not Toggle
            end
        end
    end
end

local function Check(Flag)
    local char = GetChar()
    if not char then return false end
    local HumanoidRootPart = char:FindFirstChild("HumanoidRootPart")
    if not HumanoidRootPart then return false end

    if Flag == "InLift" then
        if HumanoidRootPart.Position.X < 50 and HumanoidRootPart.Position.Z > 70 then
            return true
        end
    elseif Flag == "InGame" then
        if HumanoidRootPart.Position.X > 50 then
            return true
        end
    end
    return false
end

local function GetRandomPointInPart(Part)
    local Size = Part.Size
    local CFramePos = Part.CFrame
    
    local Rx = (math.random() - 0.5) * (Size.X * 0.9)
    local Ry = (math.random() - 0.5) * (Size.Y * 0.9)
    local Rz = (math.random() - 0.5) * (Size.Z * 0.9)
    
    return CFramePos * CFrame.new(Rx, Ry, Rz)
end

-- ==============================================================================
-- [MAIN LOGIC]
-- ==============================================================================

local MapDetect
local ConnectMap

local function OnMapLoad(Map)
    CurrentlyFarming = true
    Escaped = false 

    local Settings = Map:WaitForChild("Settings", 10)
    if Settings then
        local MapName = Settings:GetAttribute("MapName")
        if MapName then 
            Alert("[MAP] Config Loaded: " .. MapName, "Info") 
        end
    end
    
    if Check("InGame") == false then
        Alert("[STATUS] Outside game zone. Standing by...", "Warning")
    end

    local Buttons = {}
    -- Single Scan
    for i, MapObject in pairs(Map:GetDescendants()) do
        if isRandomString(MapObject.Name) and MapObject.ClassName == "Model" then
            local Hitbox
            for i, Candidate in pairs(MapObject:GetChildren()) do
                if Candidate:IsA("BasePart") and tostring(Candidate.BrickColor) ~= "Medium stone grey" then
                    Hitbox = Candidate
                    break
                end
            end
            if Hitbox and isRandomString(Hitbox.Name) then
                Hitbox.Name = "Hitbox"
                table.insert(Buttons, MapObject)
            end
        end
    end

    local HumanoidRootPart = GetChar():WaitForChild("HumanoidRootPart")
    -- Items
    local LostPage = Map:FindFirstChild("_LostPage", true)
    local Rescue = Map:FindFirstChild("_Rescue", true)
    local OriginalCFrame = HumanoidRootPart.CFrame
    
    if LostPage then
        HumanoidRootPart.CFrame = LostPage.CFrame
        task.wait()
        HumanoidRootPart.CFrame = OriginalCFrame
        Alert("[COLLECT] Hidden Page Acquired.", "Item")
    end
    if Rescue then
        HumanoidRootPart.CFrame = Rescue.Contact.CFrame
        task.wait()
        HumanoidRootPart.CFrame = OriginalCFrame
        Alert("[ACTION] Survivor Rescued.", "Item")
    end

    -- Auto Farm Loop
    Alert("[FARM] Sequence Initialized. Scanning...", "Success")
    local CurrentButton = nil
    local Humanoid = GetChar():WaitForChild("Humanoid")
    
    local GodMode = Humanoid:GetPropertyChangedSignal("Health"):Connect(function()
        Humanoid.Health = 1000
    end)
    TrackConnection(GodMode)
    
    local HRP = GetChar():FindFirstChild("HumanoidRootPart")
    
    Noclip(true)
    
    while RunService.Heartbeat:Wait() and Check("InGame") and getgenv().TomatoAutoFarm do
        if not CurrentlyFarming then break end

        local ExitRegion = Map:FindFirstChild("ExitRegion", true)
        local HRP = GetChar():FindFirstChild("HumanoidRootPart")
        if not HRP then break end
        
        local FailedScan = true
        
        if not ExitRegion then
            -- == BUTTON PHASE ==
            if Camera.CameraSubject ~= Humanoid then
                Camera.CameraSubject = Humanoid
            end

            HRP.Anchored = true
            for i, Button in pairs(Buttons) do
                if not getgenv().TomatoAutoFarm then break end 

                local ButtonHitbox = Button:FindFirstChild("Hitbox")
                if ButtonHitbox then
                    CurrentButton = Button
                    local TouchFound = Button:FindFirstChild("TouchInterest", true)
                    local GuiFound = Button:FindFirstChildWhichIsA("BillboardGui", true)
                    
                    if (TouchFound and GuiFound) then
                        FailedScan = false
                        HRP.Anchored = false
                        HRP.CFrame = CFrame.new(ButtonHitbox.Position - Vector3.new(math.random(), math.random(), math.random()))
                        Humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
                        task.wait(0.05)
                        Humanoid:ChangeState(Enum.HumanoidStateType.Running)
                        task.wait(0.05)
                    end
                end
            end
            if FailedScan == true then
                RunService.Heartbeat:Wait()
            end

        elseif ExitRegion then
            -- == EXIT PHASE ==
            Noclip(false)
            HRP.Anchored = false
            
            if Camera.CameraSubject ~= ExitRegion then
                Camera.CameraSubject = ExitRegion
            end

            if not Escaped then
                local TargetCFrame = GetRandomPointInPart(ExitRegion)
                HRP.CFrame = TargetCFrame
                HRP.Velocity = Vector3.zero
                Humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
            else
                Escaped = false 
                Camera.CameraSubject = Humanoid
                Humanoid:ChangeState(Enum.HumanoidStateType.Dead)
                Alert("[SUCCESS] Escape Detected. Resetting...", "Success")
                break
            end
        end
    end
    
    if Camera.CameraSubject ~= Humanoid then
        Camera.CameraSubject = Humanoid
    end
    Noclip(false)
    Alert("[FINISH] Protocol Complete.", "Info")
    if GodMode then GodMode:Disconnect() end
    
    Alert("[IDLE] Awaiting next match...", "System")
    CurrentlyFarming = false
end

-- ==============================================================================
-- [INTERNAL] MAIN LOOP (Features 5 & 6)
-- ==============================================================================

ConnectMap = function()
    MapDetect = Multiplayer.ChildAdded:Connect(function(NewMap)
        NewMap:GetPropertyChangedSignal("Name"):Wait()
        
        if getgenv().TomatoAutoFarm == true then
            OnMapLoad(NewMap)
            Alert("[NET] Map Detected. Connecting...", "Info")
        end
    end)
    TrackConnection(MapDetect)
end

if _G.LoopCancel ~= nil then
    _G.LoopCancel = true
    task.wait(.1)
end
_G.LoopCancel = false
Alert("[SYSTEM] AutoFarm Active.", "Success")

task.spawn(function()
    while task.wait(1) do
        if _G.LoopCancel == true then break end
        
        if LocalPlayer.Character and LocalPlayer.Character:FindFirstChild("HumanoidRootPart") then
            local inLift = Check("InLift")
            local inGame = Check("InGame")

            if not inLift and not inGame and getgenv().TomatoAutoFarm then
                AddedWaiting:FireServer()
            end
        end
    end
end)

task.spawn(function()
    while task.wait(0.5) do
        if _G.LoopCancel == true then
            Alert("[SYSTEM] Previous Script Terminated.", "Error")
            if MapDetect then MapDetect:Disconnect() end
            break
        end
        
        if not MapDetect then
            ConnectMap()
        end

        if getgenv().TomatoAutoFarm == false then
            Alert("[PAUSE] Operation suspended by user.", "Warning")
            repeat 
                task.wait(0.5) 
            until getgenv().TomatoAutoFarm == true or _G.LoopCancel == true
            
            if _G.LoopCancel == false then
                Alert("[RESUME] Operation continued.", "Success")
            end
        end
    end
end)
