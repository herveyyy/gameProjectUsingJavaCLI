package classesAndSkill;




public class WarriorClass {
    private String nameClass;
    private double defaultHP;
    private double defaultStamina;
    private double defaultMana;
    //progress and possesions
    private int defaultLevel;
    
    public String getNameClass(){
    this.nameClass = "Warrior";
        return nameClass;
    }
    public double getDefaultHP(){
     this.defaultHP = 120;

        return defaultHP;
    }
    public double getDefaultStamina(){
     this.defaultStamina = 100;

        return defaultStamina;
    }
    public double getDefaultMana(){
     this.defaultMana = 70;
        return defaultMana;
        
    }
    public int getDefaultLevel(){
     this.defaultLevel = 1;
        return defaultLevel;
        
    }
    
    
}

